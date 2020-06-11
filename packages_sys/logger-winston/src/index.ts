import * as W from "winston"

import * as T from "@matechs/core/Effect"
import { pipe } from "@matechs/core/Function"
import * as Layer from "@matechs/core/Layer"
import * as F from "@matechs/core/Service"
import * as L from "@matechs/logger/Logger"

export const WinstonFactoryURI = "@matechs/logger-winston/WinstonFactoryURI"

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

export const WinstonInstanceURI = "@matechs/logger-winston/WinstonInstanceURI"

export interface WinstonInstance {
  [WinstonInstanceURI]: {
    logger: W.Logger
  }
}

export const WinstonInstance = pipe(
  logger,
  Layer.useEffect((logger) =>
    Layer.fromValue<WinstonInstance>({
      [WinstonInstanceURI]: {
        logger
      }
    })
  )
)

export const Child = (meta: L.Meta) =>
  pipe(
    T.access((_: WinstonInstance) => _[WinstonInstanceURI].logger),
    Layer.useEffect((logger) =>
      Layer.fromValue<WinstonInstance>({
        [WinstonInstanceURI]: {
          logger: logger.child(meta)
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

const log = (level: L.Level, message: string, meta?: L.Meta) =>
  T.access((_: WinstonInstance) =>
    _[WinstonInstanceURI].logger.log(level, message, meta)
  )

export const WinstonLogger = pipe(
  F.layer(L.LoggerService)({
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
).with(WinstonInstance)
