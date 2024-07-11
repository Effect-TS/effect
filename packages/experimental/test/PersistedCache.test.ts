import * as PersistedCache from "@effect/experimental/PersistedCache"
import * as Persistence from "@effect/experimental/Persistence"
import * as TimeToLive from "@effect/experimental/TimeToLive"
import { KeyValueStore } from "@effect/platform"
import { Schema } from "@effect/schema"
import * as it from "@effect/vitest"
import { Effect, Exit, Layer, Option, PrimaryKey } from "effect"
import { assert, describe } from "vitest"

class User extends Schema.Class<User>("User")({
  id: Schema.Number,
  name: Schema.String
}) {}

class TTLRequest extends Schema.TaggedRequest<TTLRequest>()("TTLRequest", {
  failure: Schema.String,
  success: User,
  payload: {
    id: Schema.Number
  }
}) {
  [PrimaryKey.symbol]() {
    return `TTLRequest:${this.id}`
  }
  [TimeToLive.symbol](_exit: Exit.Exit<User, string>) {
    return 5000
  }
}

describe("PersistedCache", () => {
  const testsuite = (storeId: "memory" | "kvs", layer: Layer.Layer<Persistence.ResultPersistence, unknown>) =>
    it.scoped(storeId, () =>
      Effect.gen(function*() {
        const persistence = yield* Persistence.ResultPersistence
        const store = yield* persistence.make("users")
        let invocations = 0
        let cache = yield* PersistedCache.make({
          storeId: "users",
          lookup: (req: TTLRequest) =>
            Effect.sync(() => {
              invocations++
              return new User({ id: req.id, name: "John" })
            })
        })
        const user = yield* cache.get(new TTLRequest({ id: 1 }))
        assert.deepStrictEqual(user, new User({ id: 1, name: "John" }))
        assert.deepStrictEqual(
          yield* store.get(new TTLRequest({ id: 1 })),
          Option.some(Exit.succeed(new User({ id: 1, name: "John" })))
        )
        assert.strictEqual(invocations, 1)
        assert.deepStrictEqual(yield* cache.get(new TTLRequest({ id: 1 })), new User({ id: 1, name: "John" }))
        assert.strictEqual(invocations, 1)

        cache = yield* PersistedCache.make({
          storeId: "users",
          lookup: (req: TTLRequest) =>
            Effect.sync(() => {
              invocations++
              return new User({ id: req.id, name: "John" })
            })
        })
        assert.deepStrictEqual(yield* cache.get(new TTLRequest({ id: 1 })), new User({ id: 1, name: "John" }))
        assert.strictEqual(invocations, 1)
      }).pipe(Effect.provide(layer)))

  testsuite("memory", Persistence.layerResultMemory)
  testsuite("kvs", Persistence.layerResultKeyValueStore.pipe(Layer.provide(KeyValueStore.layerMemory)))
})
