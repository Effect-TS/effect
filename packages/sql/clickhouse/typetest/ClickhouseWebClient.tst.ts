import type * as ClickhouseWeb from "@clickhouse/client-web"
import { ClickhouseClient, ClickhouseWebClient } from "@effect/sql-clickhouse"
import { Effect, Layer } from "effect"
import { SqlClient } from "effect/sql"
import { describe, expect, it } from "tstyche"

const program = Effect.service(ClickhouseWebClient.ClickhouseWebClient).pipe(Effect.asVoid)
const sqlClient = Layer.succeed(SqlClient.SqlClient, {} as SqlClient.SqlClient)

describe("ClickhouseWebClient", () => {
  it("is not provided by a SqlClient layer", () => {
    expect(Effect.provide(program, sqlClient)).type.toBe<
      Effect.Effect<void, never, ClickhouseWebClient.ClickhouseWebClient>
    >()
  })

  it("is distinct from the Node client service", () => {
    expect<Effect.Effect<void, never, ClickhouseClient.ClickhouseClient>>().type.not.toBeAssignableFrom(program)
    expect<Effect.Effect<void, never, ClickhouseWebClient.ClickhouseWebClient>>().type.not.toBeAssignableFrom(
      Effect.service(ClickhouseClient.ClickhouseClient).pipe(Effect.asVoid)
    )
  })

  it("yields a client that is also a SqlClient", () => {
    expect(Effect.service(ClickhouseWebClient.ClickhouseWebClient)).type.toBeAssignableTo<
      Effect.Effect<
        ClickhouseWebClient.ClickhouseWebClient & SqlClient.SqlClient,
        never,
        ClickhouseWebClient.ClickhouseWebClient
      >
    >()
  })

  it("exposes the web ClickHouse client and rejects streaming inserts", () => {
    expect<ClickhouseWebClient.ClickhouseWebClient["client"]>().type.toBe<ClickhouseWeb.ClickHouseClient>()
    expect<Parameters<ClickhouseWebClient.ClickhouseWebClient["insertQuery"]>[0]["values"]>().type.not
      .toBeAssignableFrom<ReadableStream>()
  })

  it("accepts a custom fetch", () => {
    expect<ClickhouseWebClient.ClickhouseWebClientConfig["fetch"]>().type.toBe<typeof fetch | undefined>()
  })
})
