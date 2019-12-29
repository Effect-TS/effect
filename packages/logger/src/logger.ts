import { effect as T, freeEnv as F } from "@matechs/effect";

export const loggerEnv: unique symbol = Symbol();

export interface Meta {
  [k: string]: any;
}

export const loggerM = F.define({
  [loggerEnv]: {
    silly: F.fn<(message: string, meta?: Meta) => T.UIO<void>>(),
    debug: F.fn<(message: string, meta?: Meta) => T.UIO<void>>(),
    verbose: F.fn<(message: string, meta?: Meta) => T.UIO<void>>(),
    http: F.fn<(message: string, meta?: Meta) => T.UIO<void>>(),
    info: F.fn<(message: string, meta?: Meta) => T.UIO<void>>(),
    warn: F.fn<(message: string, meta?: Meta) => T.UIO<void>>(),
    error: F.fn<(message: string, meta?: Meta) => T.UIO<void>>()
  }
});

export type LoggerSpec = typeof loggerM;

export type Logger = F.TypeOf<LoggerSpec>;

export type Level = keyof Logger[typeof loggerEnv];

export type Provider<R> = F.Provider<R, Logger>;

export const severity: Record<Level, number> = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
};

export const {
  [loggerEnv]: { silly, debug, verbose, http, info, warn, error }
} = F.access(loggerM);
