import { createLogger } from "./logger";

const MAX_BODY_LENGTH = 400;
type NextHandler = () => Promise<void>;

// 截断长文
function trimText(value: string) {
  if (value.length <= MAX_BODY_LENGTH) {
    return value;
  }

  return `${value.slice(0, MAX_BODY_LENGTH)}...`;
}

// 读取响应
async function readResponseText(response: Response) {
  try {
    return trimText(await response.clone().text());
  } catch {
    return "";
  }
}

// 创建请求日志
export function createRequestLogger(scope: string) {
  const logger = createLogger(scope);

  return async (context: any, next: NextHandler) => {
    const startedAt = Date.now();
    const url = new URL(context.req.url);
    const path = `${url.pathname}${url.search}`;

    try {
      await next();
    } catch (error) {
      logger.error("request threw", {
        durationMs: Date.now() - startedAt,
        error,
        method: context.req.method,
        path,
      });
      throw error;
    }

    const durationMs = Date.now() - startedAt;
    const status = context.res.status;

    if (status >= 400) {
      logger.warn("request failed", {
        durationMs,
        method: context.req.method,
        path,
        response: await readResponseText(context.res),
        status,
      });
      return;
    }

    logger.info("request handled", {
      durationMs,
      method: context.req.method,
      path,
      status,
    });
  };
}
