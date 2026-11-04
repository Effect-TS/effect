import { MssqlClient } from "@effect/sql-mssql"
import { Effect, Layer } from "effect"
import { SqlClient } from "effect/sql"
import { describe, expect, it } from "tstyche"

const program = Effect.service(MssqlClient.MssqlClient).pipe(Effect.asVoid)
const sqlClient = Layer.succeed(SqlClient.SqlClient, {} as SqlClient.SqlClient)

describe("MssqlClient", () => {
  it("yields the client shape and requires its identifier", () => {
    expect(Effect.service(MssqlClient.MssqlClient)).type.toBe<
      Effect.Effect<MssqlClient.MssqlClient, never, MssqlClient.MssqlClientId>
    >()
  })

  it("rejects the client shape as a requirement", () => {
    expect<Effect.Effect<void, never, MssqlClient.MssqlClient>>().type.not.toBeAssignableFrom(program)
    expect<Effect.Effect<void, never, MssqlClient.MssqlClientId>>().type.not.toBeAssignableFrom<
      Effect.Effect<void, never, MssqlClient.MssqlClient>
    >()
  })

  it("is not provided by a SqlClient layer", () => {
    expect(Effect.provide(program, sqlClient)).type.toBe<Effect.Effect<void, never, MssqlClient.MssqlClientId>>()
    expect(Layer.provide(Layer.effectDiscard(program), sqlClient)).type.toBe<
      Layer.Layer<never, never, MssqlClient.MssqlClientId>
    >()
  })
})
