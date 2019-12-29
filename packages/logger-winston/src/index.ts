import * as L from "@matechs/logger/lib/logger";
import { effect as T, freeEnv as F } from "@matechs/effect";
import * as W from "winston";
import { Do } from "fp-ts-contrib/lib/Do";

export const winstonFactoryEnv: unique symbol = Symbol();

export const winstonFactoryM = F.define({
  [winstonFactoryEnv]: {
    logger: F.cn<T.UIO<W.Logger>>()
  }
});

export const {
  [winstonFactoryEnv]: { logger }
} = F.access(winstonFactoryM);

export type WinstonFactory = F.TypeOf<typeof winstonFactoryM>;

export function log(
  level: L.Level,
  message: string,
  meta?: L.Meta
): T.RUIO<WinstonFactory, void> {
  return (
    Do(T.effect)
      .bind("logger", logger)
      .doL(s =>
        T.sync(() => {
          s.logger.log(level, message, meta);
        })
      )
      // tslint:disable-next-line: no-empty
      .return(() => {})
  );
}

export const winstonLogger: L.Provider<WinstonFactory> = F.implement(L.loggerM)(
  {
    [L.loggerEnv]: {
      debug: (message, meta) => log("debug", message, meta),
      http: (message, meta) => log("http", message, meta),
      silly: (message, meta) => log("silly", message, meta),
      error: (message, meta) => log("error", message, meta),
      info: (message, meta) => log("info", message, meta),
      verbose: (message, meta) => log("verbose", message, meta),
      warn: (message, meta) => log("warn", message, meta)
    }
  }
);
