import type { Effect } from "effect"

import * as Config from "effect/Config"

export const clickhouseConfig = Config.nested(
  Config.all({
    database: Config.String("DATABASE").pipe(Config.withDefault("market")),
    host: Config.String("HOST").pipe(Config.withDefault("127.0.0.1")),
    nativeIntegration: Config.Boolean("NATIVE_INTEGRATION").pipe(Config.withDefault(false)),
    nativeTransactionIntegration: Config.Boolean("NATIVE_TRANSACTION_INTEGRATION").pipe(Config.withDefault(false)),
    password: Config.String("PASSWORD").pipe(Config.withDefault("password")),
    poolSize: Config.Number("POOL_SIZE").pipe(Config.withDefault(4)),
    port: Config.Port("PORT").pipe(Config.withDefault(9000)),
    url: Config.String("URL").pipe(Config.withDefault("http://127.0.0.1:8123")),
    user: Config.String("USER").pipe(Config.withDefault("collector"))
  }),
  "CLICKHOUSE"
)
export type ClickHouseConfig = Effect.Success<typeof clickhouseConfig>
