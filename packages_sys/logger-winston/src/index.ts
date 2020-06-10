import * as W from "winston"

import * as T from "@matechs/core/Effect"
import { pipe } from "@matechs/core/Function"
import * as Layer from "@matechs/core/Layer"
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

export const WinstonLogger = pipe(
  logger,
  Layer.useEffect(({ log }) =>
    F.layer(L.LoggerService)({
      [L.LoggerURI]: {
        debug: (message, meta) => T.sync(() => log("debug", message, meta)),
        http: (message, meta) => T.sync(() => log("http", message, meta)),
        silly: (message, meta) => T.sync(() => log("silly", message, meta)),
        error: (message, meta) => T.sync(() => log("error", message, meta)),
        info: (message, meta) => T.sync(() => log("info", message, meta)),
        verbose: (message, meta) => T.sync(() => log("verbose", message, meta)),
        warn: (message, meta) => T.sync(() => log("warn", message, meta))
      }
    })
  )
)

/* istanbul ignore next */
export const LoggerFactory = (loggerOpts: W.LoggerOptions) =>
  F.layer(WinstonFactoryService)({
    [WinstonFactoryURI]: {
      logger: T.sync(() => W.createLogger(loggerOpts))
    }
  })
