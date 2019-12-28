import { effect as T, freeEnv as F } from "@matechs/effect";
import * as L from "./logger";

function format(level: L.Level, message: string, meta?: L.Meta) {
  return `${level}: ${message}${meta ? `(${JSON.stringify({ meta })})` : ""}`;
}

function log(
  formatter: typeof format,
  level: L.Level,
  message: string,
  meta?: L.Meta
): T.UIO<void> {
  const msg = formatter(level, message, meta);

  return T.sync(() => {
    switch (level) {
      case "info":
        // tslint:disable-next-line: no-console
        console.info(msg);
        break;
      case "debug":
        // tslint:disable-next-line: no-console
        console.debug(msg);
        break;
      case "error":
        // tslint:disable-next-line: no-console
        console.error(msg);
        break;
      case "http":
        // tslint:disable-next-line: no-console
        console.info(msg);
        break;
      case "silly":
        // tslint:disable-next-line: no-console
        console.debug(msg);
        break;
      case "verbose":
        // tslint:disable-next-line: no-console
        console.debug(msg);
        break;
      case "warn":
        // tslint:disable-next-line: no-console
        console.warn(msg);
        break;
    }
  });
}

export const consoleLogger = (formatter: typeof format = format) =>
  F.instance(L.loggerM)({
    [L.loggerEnv]: {
      debug: (message, meta) => log(formatter, "debug", message, meta),
      http: (message, meta) => log(formatter, "http", message, meta),
      silly: (message, meta) => log(formatter, "silly", message, meta),
      error: (message, meta) => log(formatter, "error", message, meta),
      info: (message, meta) => log(formatter, "info", message, meta),
      verbose: (message, meta) => log(formatter, "verbose", message, meta),
      warn: (message, meta) => log(formatter, "warn", message, meta)
    }
  });
