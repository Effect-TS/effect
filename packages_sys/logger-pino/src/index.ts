import P from "pino"

import * as T from "@matechs/core/Effect"
import { pipe } from "@matechs/core/Function"
import * as F from "@matechs/core/Service"
import { logger as L } from "@matechs/logger"

// region Pino instance
export const PinoInstanceURI = "@matechs/logger-pino/instanceURI"

export interface PinoInstanceEnv {
  [PinoInstanceURI]: {
    logger: T.Sync<P.Logger>
  }
}

export const pinoInstanceM = F.define<PinoInstanceEnv>({
  [PinoInstanceURI]: { logger: F.cn() }
})

export const {
  [PinoInstanceURI]: { logger }
} = F.access(pinoInstanceM)
// endregion

// region Pino ops
const withLogger = (f: (_: P.Logger) => T.Sync<void>) => T.chain_(logger, f)

export function fatal(
  obj: object,
  msg?: string,
  ...args: unknown[]
): T.SyncR<PinoInstanceEnv, void>
export function fatal(msg: string, ...args: unknown[]): T.SyncR<PinoInstanceEnv, void>
export function fatal(...args: [any, ...unknown[]]): T.SyncR<PinoInstanceEnv, void> {
  return withLogger((l) => T.sync(() => l.fatal(...args)))
}

export function error(
  obj: object,
  msg?: string,
  ...args: unknown[]
): T.SyncR<PinoInstanceEnv, void>
export function error(msg: string, ...args: unknown[]): T.SyncR<PinoInstanceEnv, void>
export function error(...args: [any, ...unknown[]]): T.SyncR<PinoInstanceEnv, void> {
  return withLogger((l) => T.sync(() => l.error(...args)))
}

export function warn(
  obj: object,
  msg?: string,
  ...args: unknown[]
): T.SyncR<PinoInstanceEnv, void>
export function warn(msg: string, ...args: unknown[]): T.SyncR<PinoInstanceEnv, void>
export function warn(...args: [any, ...unknown[]]): T.SyncR<PinoInstanceEnv, void> {
  return withLogger((l) => T.sync(() => l.warn(...args)))
}

export function info(
  obj: object,
  msg?: string,
  ...args: unknown[]
): T.SyncR<PinoInstanceEnv, void>
export function info(msg: string, ...args: unknown[]): T.SyncR<PinoInstanceEnv, void>
export function info(...args: [any, ...unknown[]]): T.SyncR<PinoInstanceEnv, void> {
  return withLogger((l) => T.sync(() => l.info(...args)))
}

export function debug(
  obj: object,
  msg?: string,
  ...args: unknown[]
): T.SyncR<PinoInstanceEnv, void>
export function debug(msg: string, ...args: unknown[]): T.SyncR<PinoInstanceEnv, void>
export function debug(...args: [any, ...unknown[]]): T.SyncR<PinoInstanceEnv, void> {
  return withLogger((l) => T.sync(() => l.debug(...args)))
}

export function trace(
  obj: object,
  msg?: string,
  ...args: unknown[]
): T.SyncR<PinoInstanceEnv, void>
export function trace(msg: string, ...args: unknown[]): T.SyncR<PinoInstanceEnv, void>
export function trace(...args: [any, ...unknown[]]): T.SyncR<PinoInstanceEnv, void> {
  return withLogger((l) => T.sync(() => l.trace(...args)))
}
// endregion

// region instances
export function providePino(
  opts?: P.LoggerOptions | P.DestinationStream
): T.Provider<unknown, PinoInstanceEnv>
export function providePino(
  opts: P.LoggerOptions,
  stream: P.DestinationStream
): T.Provider<unknown, PinoInstanceEnv>
export function providePino(...args: any[]) {
  return F.implementWith(
    pipe(
      T.trySync(() => P(...args)),
      T.orAbort
    )
  )(pinoInstanceM)((logger) => ({
    [PinoInstanceURI]: { logger: T.pure(logger) }
  }))
}

export const providePinoLogger = F.implement(L.Logger)({
  [L.LoggerURI]: {
    error: (message, meta = {}) => error(meta, message),
    warn: (message, meta = {}) => warn(meta, message),
    info: (message, meta = {}) => info(meta, message),
    http: (message, meta = {}) => info(meta, message),
    verbose: (message, meta = {}) => info(meta, message),
    debug: (message, meta = {}) => debug(meta, message),
    silly: (message, meta = {}) => trace(meta, message)
  }
})
// endregion
