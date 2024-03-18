import * as Persistence from "@effect/experimental/Persistence"
import * as PersistenceLmdb from "@effect/experimental/Persistence/Lmdb"
import * as RequestResolverX from "@effect/experimental/RequestResolver"
import { FileSystem, KeyValueStore } from "@effect/platform"
import { NodeContext } from "@effect/platform-node"
import { Schema } from "@effect/schema"
import { Effect, Layer, PrimaryKey, ReadonlyArray, RequestResolver } from "effect"
import { assert, describe, test } from "vitest"

describe("RequestResolver", () => {
  describe("persisted", () => {
    class User extends Schema.Class<User>("User")({
      id: Schema.number,
      name: Schema.string
    }) {}
    class MyRequest extends Schema.TaggedRequest<MyRequest>()("MyRequest", Schema.string, User, {
      id: Schema.number
    }) {
      [PrimaryKey.symbol]() {
        return `MyRequest:${this.id}`
      }
    }

    const testsuite = (
      storeId: "memory" | "kvs" | "lmdb",
      layer: Layer.Layer<Persistence.ResultPersistence, unknown>
    ) =>
      test(storeId, () =>
        Effect.gen(function*(_) {
          const baseResolver = RequestResolver.fromEffectTagged<MyRequest>()({
            MyRequest: (reqs) =>
              Effect.succeed(ReadonlyArray.map(reqs, (req) => new User({ id: req.id, name: "John" })))
          })
          const persisted = yield* _(RequestResolverX.persisted(baseResolver, storeId))
          let users = yield* _(
            Effect.forEach(ReadonlyArray.range(1, 5), (id) => Effect.request(new MyRequest({ id }), persisted), {
              batching: true
            })
          )
          assert.strictEqual(users.length, 5)
          users = yield* _(
            Effect.forEach(ReadonlyArray.range(1, 5), (id) => Effect.request(new MyRequest({ id }), persisted), {
              batching: true
            })
          )
          assert.strictEqual(users.length, 5)

          const persistence = yield* _(Persistence.ResultPersistence)
          const store = yield* _(persistence.make(storeId))
          yield* _(store.clear)

          users = yield* _(
            Effect.forEach(ReadonlyArray.range(1, 5), (id) => Effect.request(new MyRequest({ id }), persisted), {
              batching: true
            })
          )
          assert.strictEqual(users.length, 5)
        }).pipe(Effect.scoped, Effect.provide(layer), Effect.runPromise))

    testsuite("memory", Persistence.layerResultMemory)
    testsuite("kvs", Persistence.layerResultKeyValueStore.pipe(Layer.provide(KeyValueStore.layerMemory)))
    testsuite(
      "lmdb",
      Effect.gen(function*(_) {
        const fs = yield* _(FileSystem.FileSystem)
        const dir = yield* _(fs.makeTempDirectoryScoped())
        return PersistenceLmdb.layerResult({ path: dir })
      }).pipe(Layer.unwrapScoped, Layer.provide(NodeContext.layer))
    )
  })
})
