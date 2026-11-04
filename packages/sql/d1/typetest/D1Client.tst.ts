import { D1Client } from "@effect/sql-d1"
import { Effect, Layer } from "effect"
import { SqlClient } from "effect/sql"
import { describe, expect, it } from "tstyche"

const program = Effect.service(D1Client.D1Client).pipe(Effect.asVoid)
const sqlClient = Layer.succeed(SqlClient.SqlClient, {} as SqlClient.SqlClient)

describe("D1Client", () => {
  it("yields the client shape and requires its identifier", () => {
    expect(Effect.service(D1Client.D1Client)).type.toBe<Effect.Effect<D1Client.D1Client, never, D1Client.D1ClientId>>()
  })

  it("rejects the client shape as a requirement", () => {
    expect<Effect.Effect<void, never, D1Client.D1Client>>().type.not.toBeAssignableFrom(program)
    expect<Effect.Effect<void, never, D1Client.D1ClientId>>().type.not.toBeAssignableFrom<
      Effect.Effect<void, never, D1Client.D1Client>
    >()
  })

  it("is not provided by a SqlClient layer", () => {
    expect(Effect.provide(program, sqlClient)).type.toBe<Effect.Effect<void, never, D1Client.D1ClientId>>()
    expect(Layer.provide(Layer.effectDiscard(program), sqlClient)).type.toBe<
      Layer.Layer<never, never, D1Client.D1ClientId>
    >()
  })
})
