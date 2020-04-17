import { effect as T, freeEnv as F } from "@matechs/effect";
import { logger as L } from "@matechs/logger";
import P from "pino";

// region Pino instance
export const PinoInstanceURI = "@matechs/pino/instanceURI";

export interface PinoInstanceEnv {
  [PinoInstanceURI]: {
    logger: T.Sync<P.Logger>;
  };
}

export const pinoInstanceM = F.define<PinoInstanceEnv>({
  [PinoInstanceURI]: { logger: F.cn() }
});

export const {
  [PinoInstanceURI]: { logger }
} = F.access(pinoInstanceM);
// endregion

// region Pino ops
export const PinoLoggerURI = "@matechs/pino/loggerURI";

export interface LogFn {
  (obj: object, msg?: string, ...args: unknown[]): T.Sync<void>;
  (msg: string, ...args: unknown[]): T.Sync<void>;
}

export interface PinoLogger {
  [PinoLoggerURI]: {
    fatal: LogFn;
    error: LogFn;
    warn: LogFn;
    info: LogFn;
    debug: LogFn;
    trace: LogFn;
  };
}

export function fatal(obj: object, msg?: string, ...args: unknown[]): T.SyncR<PinoLogger, void>;
export function fatal(msg: string, ...args: unknown[]): T.SyncR<PinoLogger, void>;
export function fatal(...args: [any, ...unknown[]]): T.SyncR<PinoLogger, void> {
  return T.accessM((r: PinoLogger) => r[PinoLoggerURI].fatal(...args));
}

export function error(obj: object, msg?: string, ...args: unknown[]): T.SyncR<PinoLogger, void>;
export function error(msg: string, ...args: unknown[]): T.SyncR<PinoLogger, void>;
export function error(...args: [any, ...unknown[]]): T.SyncR<PinoLogger, void> {
  return T.accessM((r: PinoLogger) => r[PinoLoggerURI].error(...args));
}

export function warn(obj: object, msg?: string, ...args: unknown[]): T.SyncR<PinoLogger, void>;
export function warn(msg: string, ...args: unknown[]): T.SyncR<PinoLogger, void>;
export function warn(...args: [any, ...unknown[]]): T.SyncR<PinoLogger, void> {
  return T.accessM((r: PinoLogger) => r[PinoLoggerURI].warn(...args));
}

export function info(obj: object, msg?: string, ...args: unknown[]): T.SyncR<PinoLogger, void>;
export function info(msg: string, ...args: unknown[]): T.SyncR<PinoLogger, void>;
export function info(...args: [any, ...unknown[]]): T.SyncR<PinoLogger, void> {
  return T.accessM((r: PinoLogger) => r[PinoLoggerURI].info(...args));
}

export function debug(obj: object, msg?: string, ...args: unknown[]): T.SyncR<PinoLogger, void>;
export function debug(msg: string, ...args: unknown[]): T.SyncR<PinoLogger, void>;
export function debug(...args: [any, ...unknown[]]): T.SyncR<PinoLogger, void> {
  return T.accessM((r: PinoLogger) => r[PinoLoggerURI].debug(...args));
}

export function trace(obj: object, msg?: string, ...args: unknown[]): T.SyncR<PinoLogger, void>;
export function trace(msg: string, ...args: unknown[]): T.SyncR<PinoLogger, void>;
export function trace(...args: [any, ...unknown[]]): T.SyncR<PinoLogger, void> {
  return T.accessM((r: PinoLogger) => r[PinoLoggerURI].trace(...args));
}
// endregion

// region instances
export function providePinoInstance(opts?: {}): T.Provider<unknown, PinoInstanceEnv>;
export function providePinoInstance(
  opts: P.LoggerOptions,
  stream?: P.DestinationStream
): T.Provider<unknown, PinoInstanceEnv, unknown>;
export function providePinoInstance(opts: P.LoggerOptions = {}, stream?: P.DestinationStream) {
  return F.implementWith(T.trySync(() => P(opts, stream as P.DestinationStream)))(pinoInstanceM)(
    (logger) => ({
      [PinoInstanceURI]: { logger: T.pure(logger) }
    })
  );
}

export const providePino = T.provideM(
  T.effect.map(
    logger,
    (l): PinoLogger => ({
      [PinoLoggerURI]: {
        fatal: (...args: [any, ...unknown[]]) => T.sync(() => l.fatal(...args)),
        error: (...args: [any, ...unknown[]]) => T.sync(() => l.error(...args)),
        warn: (...args: [any, ...unknown[]]) => T.sync(() => l.warn(...args)),
        info: (...args: [any, ...unknown[]]) => T.sync(() => l.info(...args)),
        debug: (...args: [any, ...unknown[]]) => T.sync(() => l.debug(...args)),
        trace: (...args: [any, ...unknown[]]) => T.sync(() => l.trace(...args))
      }
    })
  )
);

export const providePinoForLogger = F.implement(L.Logger)({
  [L.LoggerURI]: {
    error: (message, meta = {}) =>
      T.effect.chain(logger, (l) => T.sync(() => l.error(meta, message))),
    warn: (message, meta = {}) =>
      T.effect.chain(logger, (l) => T.sync(() => l.warn(meta, message))),
    info: (message, meta = {}) =>
      T.effect.chain(logger, (l) => T.sync(() => l.info(meta, message))),
    http: (message, meta = {}) =>
      T.effect.chain(logger, (l) => T.sync(() => l.info(meta, message))),
    verbose: (message, meta = {}) =>
      T.effect.chain(logger, (l) => T.sync(() => l.info(meta, message))),
    debug: (message, meta = {}) =>
      T.effect.chain(logger, (l) => T.sync(() => l.debug(meta, message))),
    silly: (message, meta = {}) =>
      T.effect.chain(logger, (l) => T.sync(() => l.trace(meta, message)))
  }
});
// endregion
