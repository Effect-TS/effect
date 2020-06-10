import * as W from "winston"

import * as T from "@matechs/core/Effect"
import * as F from "@matechs/core/Service"
import * as L from "@matechs/logger/Logger"

export const WinstonFactoryURI = "@matechs/logger-winston/winstonFactoryURI"

export const WinstonFactoryService_ = F.define({
  [WinstonFactoryURI]: {
    logger: F.cn<T.Sync<W.Logger>>()
  }
})

export interface WinstonFactory extends F.TypeOf<typeof WinstonFactoryService_> {}

export const WinstonFactoryService = F.opaque<WinstonFactory>()(WinstonFactoryService_)

export const {
  [WinstonFactoryURI]: { logger }
} = F.access(WinstonFactoryService)

export function log(
  level: L.Level,
  message: string,
  meta?: L.Meta
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

export const WinstonLogger = F.layer(L.LoggerService)({
  [L.LoggerURI]: {
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
export const LoggerFactory = (loggerOpts: W.LoggerOptions) =>
  F.layer(WinstonFactoryService)({
    [WinstonFactoryURI]: {
      logger: T.sync(() => W.createLogger(loggerOpts))
    }
  })
