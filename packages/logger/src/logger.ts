import { effect as T, freeEnv as F } from "@matechs/effect";

export const loggerEnv: unique symbol = Symbol();

export interface Meta {
  [k: string]: any;
}

export type LogFn = (message: string, meta?: Meta | undefined) => T.UIO<void>;

export interface Logger extends F.ModuleShape<Logger> {
  [loggerEnv]: {
    silly: LogFn;
    debug: LogFn;
    verbose: LogFn;
    http: LogFn;
    info: LogFn;
    warn: LogFn;
    error: LogFn;
  };
}

export const loggerM = F.define<Logger>({
  [loggerEnv]: {
    silly: F.fn(),
    debug: F.fn(),
    verbose: F.fn(),
    http: F.fn(),
    info: F.fn(),
    warn: F.fn(),
    error: F.fn()
  }
});

export type Level = keyof Logger[typeof loggerEnv];

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
