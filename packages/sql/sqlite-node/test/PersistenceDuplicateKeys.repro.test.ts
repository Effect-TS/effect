import { SqliteClient } from "@effect/sql-sqlite-node"
import { assert, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { Persistence } from "effect/unstable/persistence"

it.effect("SQL getMany returns a value for every duplicate input key", () =>
  Effect.gen(function*() {
    const backing = yield* Persistence.BackingPersistence
    const store = yield* backing.make("duplicate_keys")
    yield* store.set("key", { value: 1 }, undefined)

    assert.deepStrictEqual(yield* store.getMany(["key", "key"]), [{ value: 1 }, { value: 1 }])
  }).pipe(
    Effect.scoped,
    Effect.provide(
      Persistence.layerBackingSql.pipe(
        Layer.provide(SqliteClient.layer({ filename: ":memory:" }))
      )
    )
  ))
