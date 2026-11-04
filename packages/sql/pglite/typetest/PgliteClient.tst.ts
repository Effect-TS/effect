import { PgliteClient } from "@effect/sql-pglite"
import { Effect, Layer } from "effect"
import { SqlClient } from "effect/sql"
import { describe, expect, it } from "tstyche"

const program = Effect.service(PgliteClient.PgliteClient).pipe(Effect.asVoid)
const sqlClient = Layer.succeed(SqlClient.SqlClient, {} as SqlClient.SqlClient)

describe("PgliteClient", () => {
  it("yields the client shape and requires its identifier", () => {
    expect(Effect.service(PgliteClient.PgliteClient)).type.toBe<
      Effect.Effect<PgliteClient.PgliteClient, never, PgliteClient.PgliteClientId>
    >()
  })

  it("rejects the client shape as a requirement", () => {
    expect<Effect.Effect<void, never, PgliteClient.PgliteClient>>().type.not.toBeAssignableFrom(program)
    expect<Effect.Effect<void, never, PgliteClient.PgliteClientId>>().type.not.toBeAssignableFrom<
      Effect.Effect<void, never, PgliteClient.PgliteClient>
    >()
  })

  it("is not provided by a SqlClient layer", () => {
    expect(Effect.provide(program, sqlClient)).type.toBe<Effect.Effect<void, never, PgliteClient.PgliteClientId>>()
    expect(Layer.provide(Layer.effectDiscard(program), sqlClient)).type.toBe<
      Layer.Layer<never, never, PgliteClient.PgliteClientId>
    >()
  })
})
