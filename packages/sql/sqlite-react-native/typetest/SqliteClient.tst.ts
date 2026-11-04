import { SqliteClient } from "@effect/sql-sqlite-react-native"
import { Effect, Layer } from "effect"
import { SqlClient } from "effect/sql"
import { describe, expect, it } from "tstyche"

const program = Effect.service(SqliteClient.SqliteClient).pipe(Effect.asVoid)
const sqlClient = Layer.succeed(SqlClient.SqlClient, {} as SqlClient.SqlClient)

describe("SqliteClient", () => {
  it("yields the client shape and requires its identifier", () => {
    expect(Effect.service(SqliteClient.SqliteClient)).type.toBe<
      Effect.Effect<SqliteClient.SqliteClient, never, SqliteClient.SqliteClientId>
    >()
  })

  it("rejects the client shape as a requirement", () => {
    expect<Effect.Effect<void, never, SqliteClient.SqliteClient>>().type.not.toBeAssignableFrom(program)
    expect<Effect.Effect<void, never, SqliteClient.SqliteClientId>>().type.not.toBeAssignableFrom<
      Effect.Effect<void, never, SqliteClient.SqliteClient>
    >()
  })

  it("is not provided by a SqlClient layer", () => {
    expect(Effect.provide(program, sqlClient)).type.toBe<Effect.Effect<void, never, SqliteClient.SqliteClientId>>()
    expect(Layer.provide(Layer.effectDiscard(program), sqlClient)).type.toBe<
      Layer.Layer<never, never, SqliteClient.SqliteClientId>
    >()
  })
})
