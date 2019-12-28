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

export type Logger = F.TypeOf<typeof loggerM>;

export type Level = keyof Logger[typeof loggerEnv];

export const {
  [loggerEnv]: { silly, debug, verbose, http, info, warn, error }
} = F.access(loggerM);
