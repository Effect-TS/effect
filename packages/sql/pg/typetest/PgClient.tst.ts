import { PgClient } from "@effect/sql-pg"
import { Config, Context, Effect, type Layer, type Scope } from "effect"
import type * as Reactivity from "effect/reactivity/Reactivity"
import type { SqlClient, SqlError } from "effect/sql"
import { describe, expect, it } from "tstyche"

class Prefix extends Context.Service<Prefix, string>()("Prefix") {}

const onAcquire = Effect.asVoid(Effect.service(Prefix))

describe("PgClient onAcquire", () => {
  it("adds the hook's requirements to the constructors", () => {
    expect(PgClient.make({ onAcquire })).type.toBe<
      Effect.Effect<PgClient.PgClient, SqlError.SqlError, Scope.Scope | Reactivity.Reactivity | Prefix>
    >()
    expect(PgClient.makeClient({ onAcquire })).type.toBe<
      Effect.Effect<PgClient.PgClient, SqlError.SqlError, Scope.Scope | Reactivity.Reactivity | Prefix>
    >()
  })

  it("adds the hook's requirements to the layers", () => {
    expect(PgClient.layer({ onAcquire })).type.toBe<
      Layer.Layer<PgClient.PgClient | SqlClient.SqlClient, SqlError.SqlError, Prefix>
    >()
    expect(PgClient.layerConfig({ onAcquire: Config.succeed(onAcquire) })).type.toBe<
      Layer.Layer<PgClient.PgClient | SqlClient.SqlClient, Config.ConfigError | SqlError.SqlError, Prefix>
    >()
  })

  it("requires nothing for a hook without requirements", () => {
    expect(PgClient.layer({ onAcquire: Effect.void })).type.toBe<
      Layer.Layer<PgClient.PgClient | SqlClient.SqlClient, SqlError.SqlError>
    >()
  })
})
