import { TrinoClient } from "@effect/sql-trino"
import { Effect, Layer } from "effect"
import { SqlClient } from "effect/sql"
import { describe, expect, it } from "tstyche"

const program = Effect.service(TrinoClient.TrinoClient).pipe(Effect.asVoid)
const sqlClient = Layer.succeed(SqlClient.SqlClient, {} as SqlClient.SqlClient)

describe("TrinoClient", () => {
  it("is not provided by a SqlClient layer", () => {
    expect(Effect.provide(program, sqlClient)).type.toBe<
      Effect.Effect<void, never, TrinoClient.TrinoClient>
    >()
    expect(Layer.provide(Layer.effectDiscard(program), sqlClient)).type.toBe<
      Layer.Layer<never, never, TrinoClient.TrinoClient>
    >()
  })

  it("yields a client that is also a SqlClient", () => {
    expect(Effect.service(TrinoClient.TrinoClient)).type.toBeAssignableTo<
      Effect.Effect<TrinoClient.TrinoClient & SqlClient.SqlClient, never, TrinoClient.TrinoClient>
    >()
  })

  it("rejects incorrect requirement annotations", () => {
    expect<Effect.Effect<void, never, SqlClient.SqlClient>>().type.not.toBeAssignableFrom(program)
    expect<Effect.Effect<void, never, TrinoClient.TrinoClient>>().type.not.toBeAssignableFrom(
      Effect.service(SqlClient.SqlClient).pipe(Effect.asVoid)
    )
  })
})
