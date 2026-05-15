#!/usr/bin/env node

const DEFAULT_PROJECT_NAME = "Webhook Verification";
const DEFAULT_ALERT_TITLE = "TypeError: Cannot read properties of undefined";
const TRAILING_SLASH_RE = /\/$/;
const HTTP_URL_RE = /^https?:\/\//;

// 打印用法
function printUsage() {
  console.log(`Usage:
  BASE_URL="http://localhost:8788" npm run verify:webhook
  npm run verify:webhook -- --base-url "https://your-backend.example.com" --ack

Options:
  --base-url <url>       Remote Backend base URL
  --project-name <name>  Test project name
  --ack                  Verify sync-ack flow
  --help                 Show this help
`);
}

// 参数解析
function parseArgs(argv) {
  const args = {
    ack: false,
    baseUrl: process.env.BASE_URL || "",
    projectName: DEFAULT_PROJECT_NAME,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--ack") {
      args.ack = true;
      continue;
    }

    if (token === "--help" || token === "-h") {
      args.help = true;
      continue;
    }

    if (token === "--base-url") {
      args.baseUrl = argv[index + 1] || "";
      index += 1;
      continue;
    }

    if (token === "--project-name") {
      args.projectName = argv[index + 1] || "";
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  return args;
}

// 去尾斜杠
function normalizeBaseUrl(baseUrl) {
  const nextBaseUrl = baseUrl.trim().replace(TRAILING_SLASH_RE, "");

  if (!nextBaseUrl) {
    throw new Error("BASE_URL or --base-url is required.");
  }

  return nextBaseUrl;
}

// 拼接地址
function buildUrl(baseUrl, path) {
  if (HTTP_URL_RE.test(path)) {
    return path;
  }

  return `${baseUrl}${path}`;
}

// 读响应体
async function readResponse(response) {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// 请求数据
async function requestJson(baseUrl, path, init = {}) {
  const response = await fetch(buildUrl(baseUrl, path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const body = await readResponse(response);

  if (!response.ok) {
    throw new Error(
      `${init.method || "GET"} ${path} failed: ${response.status} ${JSON.stringify(body)}`
    );
  }

  return body;
}

// 字符校验
function requireString(value, name) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${name} is missing.`);
  }

  return value;
}

// 构建报警
function buildAlertPayload() {
  return {
    count: 1,
    environment: "verification",
    message: "Cannot read properties of undefined (reading map)",
    occurredAt: new Date().toISOString(),
    priority: "P1",
    source: "verify-script",
    sourceUrl: "https://example.com/users",
    stack:
      "TypeError: Cannot read properties of undefined (reading map)\n" +
      "    at UserList (src/pages/UserList.tsx:42:18)",
    title: DEFAULT_ALERT_TITLE,
  };
}

// 主流程
async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printUsage();
    return;
  }

  const baseUrl = normalizeBaseUrl(args.baseUrl);
  const projectName = `${args.projectName} ${new Date().toISOString()}`;

  console.log(`Checking Remote Backend: ${baseUrl}`);
  const health = await requestJson(baseUrl, "/health");

  if (!health?.ok) {
    throw new Error(`Health check failed: ${JSON.stringify(health)}`);
  }

  console.log("Creating project...");
  const project = await requestJson(baseUrl, "/projects", {
    body: JSON.stringify({
      name: projectName,
    }),
    method: "POST",
  });
  const projectId = requireString(project?.id, "project.id");
  const webhookUrl = requireString(project?.webhookUrl, "project.webhookUrl");

  console.log(`Project: ${projectId}`);
  console.log(`Webhook: ${webhookUrl}`);

  console.log("Sending alert...");
  const ingest = await requestJson(baseUrl, webhookUrl, {
    body: JSON.stringify(buildAlertPayload()),
    method: "POST",
  });
  const alertId = requireString(ingest?.alertId, "ingest.alertId");

  console.log(`Alert: ${alertId}`);

  console.log("Listing alerts...");
  const list = await requestJson(baseUrl, `/projects/${projectId}/alerts`);
  const alerts = Array.isArray(list?.alerts) ? list.alerts : [];
  const matchedAlert = alerts.find((alert) => alert.id === alertId);

  if (!matchedAlert) {
    throw new Error(`Alert ${alertId} was not found in pending alerts.`);
  }

  if (matchedAlert.title !== DEFAULT_ALERT_TITLE) {
    throw new Error(`Unexpected alert title: ${matchedAlert.title}`);
  }

  console.log(`Pending alerts: ${alerts.length}`);

  if (args.ack) {
    console.log("Sending sync ack...");
    await requestJson(baseUrl, `/projects/${projectId}/alerts/sync-ack`, {
      body: JSON.stringify({
        alertIds: [alertId],
      }),
      method: "POST",
    });

    const nextList = await requestJson(
      baseUrl,
      `/projects/${projectId}/alerts`
    );
    const nextAlerts = Array.isArray(nextList?.alerts) ? nextList.alerts : [];
    const stillPending = nextAlerts.some((alert) => alert.id === alertId);

    if (stillPending) {
      throw new Error(`Alert ${alertId} is still pending after sync ack.`);
    }

    console.log("Sync ack verified.");
  }

  console.log("Webhook verification passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
