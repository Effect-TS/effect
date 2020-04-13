import * as L from "@matechs/logger";
import { eff as T, freeEnv as F } from "@matechs/effect";
import * as W from "winston";
import { Do } from "fp-ts-contrib/lib/Do";

export const winstonFactoryEnv = "@matechs/logger-winston/winstonFactoryURI";

export interface WinstonFactory {
  [winstonFactoryEnv]: {
    logger: T.Sync<W.Logger>;
  };
}

export const winstonFactoryM = F.define<WinstonFactory>({
  [winstonFactoryEnv]: {
    logger: F.cn()
  }
});

export const {
  [winstonFactoryEnv]: { logger }
} = F.access(winstonFactoryM);

export function log(
  level: L.logger.Level,
  message: string,
  meta?: L.logger.Meta
): T.SyncR<WinstonFactory, void> {
  return Do(T.eff)
    .bind("logger", logger)
    .doL((s) =>
      T.sync(() => {
        s.logger.log(level, message, meta);
      })
    )
    .return(() => {
      //
    });
}

export const provideWinstonLoggerEff = F.implementEff(L.logger.Logger)({
  [L.logger.LoggerURI]: {
    debug: (message, meta) => log("debug", message, meta),
    http: (message, meta) => log("http", message, meta),
    silly: (message, meta) => log("silly", message, meta),
    error: (message, meta) => log("error", message, meta),
    info: (message, meta) => log("info", message, meta),
    verbose: (message, meta) => log("verbose", message, meta),
    warn: (message, meta) => log("warn", message, meta)
  }
});

/* istanbul ignore next */
export const provideWinstonLogger = T.providerToEffect(provideWinstonLoggerEff);

/* istanbul ignore next */
export const provideLoggerFactoryEff = (loggerOpts: W.LoggerOptions) =>
  F.implementEff(winstonFactoryM)({
    [winstonFactoryEnv]: {
      logger: T.sync(() => W.createLogger(loggerOpts))
    }
  });

/* istanbul ignore next */
export const provideLoggerFactory = (loggerOpts: W.LoggerOptions) =>
  T.providerToEffect(provideLoggerFactoryEff(loggerOpts));
