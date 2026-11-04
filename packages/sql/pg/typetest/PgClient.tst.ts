import { PgClient } from "@effect/sql-pg"
import { Config, Context, Effect, Layer, type Scope } from "effect"
import * as Reactivity from "effect/reactivity/Reactivity"
import { SqlClient, type SqlError } from "effect/sql"
import { describe, expect, it } from "tstyche"

class Prefix extends Context.Service<Prefix, string>()("Prefix") {}

const onAcquire = Effect.andThen(Effect.service(Reactivity.Reactivity), Effect.service(Prefix)).pipe(Effect.asVoid)

describe("PgClient onAcquire", () => {
  it("propagates the hook's requirements, except those the layers supply", () => {
    expect(PgClient.make({ onAcquire })).type.toBe<
      Effect.Effect<PgClient.PgClient, SqlError.SqlError, Scope.Scope | Reactivity.Reactivity | Prefix>
    >()
    expect(PgClient.layer({ onAcquire })).type.toBe<
      Layer.Layer<PgClient.PgClientId | SqlClient.SqlClient, SqlError.SqlError, Prefix>
    >()
    expect(PgClient.layerConfig({ onAcquire: Config.succeed(onAcquire) })).type.toBe<
      Layer.Layer<PgClient.PgClientId | SqlClient.SqlClient, Config.ConfigError | SqlError.SqlError, Prefix>
    >()
  })
})

const program = Effect.service(PgClient.PgClient).pipe(Effect.asVoid)
const sqlClient = Layer.succeed(SqlClient.SqlClient, {} as SqlClient.SqlClient)

describe("PgClient", () => {
  it("yields the client shape and requires its identifier", () => {
    expect(Effect.service(PgClient.PgClient)).type.toBe<Effect.Effect<PgClient.PgClient, never, PgClient.PgClientId>>()
  })

  it("rejects the client shape as a requirement", () => {
    expect<Effect.Effect<void, never, PgClient.PgClient>>().type.not.toBeAssignableFrom(program)
    expect<Effect.Effect<void, never, PgClient.PgClientId>>().type.not.toBeAssignableFrom<
      Effect.Effect<void, never, PgClient.PgClient>
    >()
  })

  it("is not provided by a SqlClient layer", () => {
    expect(Effect.provide(program, sqlClient)).type.toBe<Effect.Effect<void, never, PgClient.PgClientId>>()
    expect(Layer.provide(Layer.effectDiscard(program), sqlClient)).type.toBe<
      Layer.Layer<never, never, PgClient.PgClientId>
    >()
  })
})
