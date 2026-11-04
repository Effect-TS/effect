import { LibsqlClient } from "@effect/sql-libsql"
import { Effect, Layer } from "effect"
import { SqlClient } from "effect/sql"
import { describe, expect, it } from "tstyche"

const program = Effect.service(LibsqlClient.LibsqlClient).pipe(Effect.asVoid)
const sqlClient = Layer.succeed(SqlClient.SqlClient, {} as SqlClient.SqlClient)

describe("LibsqlClient", () => {
  it("yields the client shape and requires its identifier", () => {
    expect(Effect.service(LibsqlClient.LibsqlClient)).type.toBe<
      Effect.Effect<LibsqlClient.LibsqlClient, never, LibsqlClient.LibsqlClientId>
    >()
  })

  it("rejects the client shape as a requirement", () => {
    expect<Effect.Effect<void, never, LibsqlClient.LibsqlClient>>().type.not.toBeAssignableFrom(program)
    expect<Effect.Effect<void, never, LibsqlClient.LibsqlClientId>>().type.not.toBeAssignableFrom<
      Effect.Effect<void, never, LibsqlClient.LibsqlClient>
    >()
  })

  it("is not provided by a SqlClient layer", () => {
    expect(Effect.provide(program, sqlClient)).type.toBe<Effect.Effect<void, never, LibsqlClient.LibsqlClientId>>()
    expect(Layer.provide(Layer.effectDiscard(program), sqlClient)).type.toBe<
      Layer.Layer<never, never, LibsqlClient.LibsqlClientId>
    >()
  })
})
