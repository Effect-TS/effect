import * as W from "winston"

import * as T from "@matechs/core/Effect"
import * as F from "@matechs/core/Service"
import * as L from "@matechs/logger"

export const winstonFactoryEnv = "@matechs/logger-winston/winstonFactoryURI"

export interface WinstonFactory {
  [winstonFactoryEnv]: {
    logger: T.Sync<W.Logger>
  }
}

export const winstonFactoryM = F.define<WinstonFactory>({
  [winstonFactoryEnv]: {
    logger: F.cn()
  }
})

export const {
  [winstonFactoryEnv]: { logger }
} = F.access(winstonFactoryM)

export function log(
  level: L.logger.Level,
  message: string,
  meta?: L.logger.Meta
): T.SyncR<WinstonFactory, void> {
  return T.Do()
    .bind("logger", logger)
    .doL((s) =>
      T.sync(() => {
        s.logger.log(level, message, meta)
      })
    )
    .return(() => {
      //
    })
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
})

/* istanbul ignore next */
export const provideLoggerFactory = (loggerOpts: W.LoggerOptions) =>
  F.implement(winstonFactoryM)({
    [winstonFactoryEnv]: {
      logger: T.sync(() => W.createLogger(loggerOpts))
    }
  })
