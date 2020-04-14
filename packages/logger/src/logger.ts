import { effect as T, freeEnv as F } from "@matechs/effect";

export const LoggerURI = "@matechs/logger/loggerURI";

export interface Meta {
  [k: string]: any;
}

export type LogFn = (message: string, meta?: Meta) => T.Io<void>;

const loggerM_ = F.define({
  [LoggerURI]: {
    silly: F.fn<LogFn>(),
    debug: F.fn<LogFn>(),
    verbose: F.fn<LogFn>(),
    http: F.fn<LogFn>(),
    info: F.fn<LogFn>(),
    warn: F.fn<LogFn>(),
    error: F.fn<LogFn>()
  }
});

export interface Logger extends F.TypeOf<typeof loggerM_> {}

export const Logger = F.opaque<Logger>()(loggerM_);

export type Level = keyof Logger[typeof LoggerURI];

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
  [LoggerURI]: { silly, debug, verbose, http, info, warn, error }
} = F.access(Logger);
