import { MysqlClient } from "@effect/sql-mysql2"
import { Effect, Layer } from "effect"
import { SqlClient } from "effect/sql"
import { describe, expect, it } from "tstyche"

const program = Effect.service(MysqlClient.MysqlClient).pipe(Effect.asVoid)
const sqlClient = Layer.succeed(SqlClient.SqlClient, {} as SqlClient.SqlClient)

describe("MysqlClient", () => {
  it("yields the client shape and requires its identifier", () => {
    expect(Effect.service(MysqlClient.MysqlClient)).type.toBe<
      Effect.Effect<MysqlClient.MysqlClient, never, MysqlClient.MysqlClientId>
    >()
  })

  it("rejects the client shape as a requirement", () => {
    expect<Effect.Effect<void, never, MysqlClient.MysqlClient>>().type.not.toBeAssignableFrom(program)
    expect<Effect.Effect<void, never, MysqlClient.MysqlClientId>>().type.not.toBeAssignableFrom<
      Effect.Effect<void, never, MysqlClient.MysqlClient>
    >()
  })

  it("is not provided by a SqlClient layer", () => {
    expect(Effect.provide(program, sqlClient)).type.toBe<Effect.Effect<void, never, MysqlClient.MysqlClientId>>()
    expect(Layer.provide(Layer.effectDiscard(program), sqlClient)).type.toBe<
      Layer.Layer<never, never, MysqlClient.MysqlClientId>
    >()
  })
})
