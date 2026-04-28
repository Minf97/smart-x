type LogLevel = "INFO" | "WARN" | "ERROR";
type ConsoleMethod = "error" | "log" | "warn";

interface ErrorMeta {
  message: string;
  name: string;
  stack?: string;
}

const ANSI_RESET = "\u001B[0m";
const ANSI_BOLD = "\u001B[1m";
const ANSI_DIM = "\u001B[2m";
const ANSI_RED = "\u001B[31m";
const ANSI_YELLOW = "\u001B[33m";
const ANSI_BLUE = "\u001B[34m";
const ANSI_CYAN = "\u001B[36m";

const LEVEL_COLOR_MAP = {
  ERROR: ANSI_RED,
  INFO: ANSI_BLUE,
  WARN: ANSI_YELLOW,
} satisfies Record<LogLevel, string>;

const LEVEL_METHOD_MAP = {
  ERROR: "error",
  INFO: "log",
  WARN: "warn",
} satisfies Record<LogLevel, ConsoleMethod>;

// 提取错误
function toErrorMeta(error: Error): ErrorMeta {
  return {
    message: error.message,
    name: error.name,
    stack: error.stack,
  };
}

// 包装颜色
function paint(text: string, color: string, enabled: boolean, bold = false) {
  if (!enabled) {
    return text;
  }

  const weight = bold ? ANSI_BOLD : "";

  return `${weight}${color}${text}${ANSI_RESET}`;
}

// 是否着色
function shouldUseColor(level: LogLevel) {
  if (process.env.NO_COLOR) {
    return false;
  }

  return level === "ERROR" ? !!process.stderr.isTTY : !!process.stdout.isTTY;
}

// 替换错误
function replaceError(_key: string, value: unknown) {
  if (value instanceof Error) {
    return toErrorMeta(value);
  }

  return value;
}

// 安全转串
function safeStringify(value: unknown) {
  try {
    return JSON.stringify(value, replaceError);
  } catch {
    return JSON.stringify({
      value: String(value),
    });
  }
}

// 整理附加
function formatMeta(meta: unknown, enabled: boolean) {
  if (meta === undefined) {
    return "";
  }

  return ` ${paint(safeStringify(meta), ANSI_DIM, enabled)}`;
}

// 拼日志行
function buildLine(
  scope: string,
  level: LogLevel,
  message: string,
  meta: unknown,
  enabled: boolean
) {
  const timestamp = paint(
    `[${new Date().toISOString()}]`,
    ANSI_DIM,
    enabled
  );
  const levelText = paint(`[${level}]`, LEVEL_COLOR_MAP[level], enabled, true);
  const scopeText = paint(`[${scope}]`, ANSI_CYAN, enabled, true);

  return `${timestamp} ${levelText} ${scopeText} ${message}${formatMeta(meta, enabled)}`;
}

// 创建日志器
export function createLogger(scope: string) {
  return {
    error(message: string, meta?: unknown) {
      const level = "ERROR" satisfies LogLevel;
      const enabled = shouldUseColor(level);

      console[LEVEL_METHOD_MAP[level]](
        buildLine(scope, level, message, meta, enabled)
      );
    },
    info(message: string, meta?: unknown) {
      const level = "INFO" satisfies LogLevel;
      const enabled = shouldUseColor(level);

      console[LEVEL_METHOD_MAP[level]](
        buildLine(scope, level, message, meta, enabled)
      );
    },
    warn(message: string, meta?: unknown) {
      const level = "WARN" satisfies LogLevel;
      const enabled = shouldUseColor(level);

      console[LEVEL_METHOD_MAP[level]](
        buildLine(scope, level, message, meta, enabled)
      );
    },
  };
}
