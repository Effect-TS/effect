import { ClickhouseClient } from "@effect/sql-clickhouse"
import { Effect, Layer } from "effect"
import { SqlClient } from "effect/sql"
import { describe, expect, it } from "tstyche"

const program = Effect.service(ClickhouseClient.ClickhouseClient).pipe(Effect.asVoid)
const sqlClient = Layer.succeed(SqlClient.SqlClient, {} as SqlClient.SqlClient)

describe("ClickhouseClient", () => {
  it("yields the client shape and requires its identifier", () => {
    expect(Effect.service(ClickhouseClient.ClickhouseClient)).type.toBe<
      Effect.Effect<ClickhouseClient.ClickhouseClient, never, ClickhouseClient.ClickhouseClientId>
    >()
  })

  it("rejects the client shape as a requirement", () => {
    expect<Effect.Effect<void, never, ClickhouseClient.ClickhouseClient>>().type.not.toBeAssignableFrom(program)
    expect<Effect.Effect<void, never, ClickhouseClient.ClickhouseClientId>>().type.not.toBeAssignableFrom<
      Effect.Effect<void, never, ClickhouseClient.ClickhouseClient>
    >()
  })

  it("is not provided by a SqlClient layer", () => {
    expect(Effect.provide(program, sqlClient)).type.toBe<
      Effect.Effect<void, never, ClickhouseClient.ClickhouseClientId>
    >()
    expect(Layer.provide(Layer.effectDiscard(program), sqlClient)).type.toBe<
      Layer.Layer<never, never, ClickhouseClient.ClickhouseClientId>
    >()
  })
})
