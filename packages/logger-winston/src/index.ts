import * as L from "@matechs/logger";
import { effect as T, freeEnv as F } from "@matechs/effect";
import * as W from "winston";
import { Do } from "fp-ts-contrib/lib/Do";

export const winstonFactoryEnv = "@matechs/logger-winston/winstonFactoryURI";

export interface WinstonFactory {
  [winstonFactoryEnv]: {
    logger: T.Io<W.Logger>;
  };
}

export const winstonFactoryM = F.define<WinstonFactory>({
  [winstonFactoryEnv]: {
    logger: F.cn()
  }
});

export const {
  [winstonFactoryEnv]: { logger }
} = F.access(winstonFactoryM);

export function log(
  level: L.logger.Level,
  message: string,
  meta?: L.logger.Meta
): T.IoEnv<WinstonFactory, void> {
  return Do(T.effect)
    .bind("logger", logger)
    .doL((s) =>
      T.sync(() => {
        s.logger.log(level, message, meta);
      })
    )
    .return(() => {
      //
    });
}

export const provideWinstonLogger = F.implement(L.logger.Logger)({
  [L.logger.LoggerURI]: {
    debug: (message, meta) => log("debug", message, meta),
    http: (message, meta) => log("http", message, meta),
    silly: (message, meta) => log("silly", message, meta),
    error: (message, meta) => log("error", message, meta),
    info: (message, meta) => log("info", message, meta),
    verbose: (message, meta) => log("verbose", message, meta),
    warn: (message, meta) => log("warn", message, meta)
  }
});

/* istanbul ignore next */
export const provideLoggerFactory = (loggerOpts: W.LoggerOptions) =>
  F.implement(winstonFactoryM)({
    [winstonFactoryEnv]: {
      logger: T.sync(() => W.createLogger(loggerOpts))
    }
  });
