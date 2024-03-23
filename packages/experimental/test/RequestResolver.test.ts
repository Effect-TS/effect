import * as Persistence from "@effect/experimental/Persistence"
import * as PersistenceLmdb from "@effect/experimental/Persistence/Lmdb"
import * as RequestResolverX from "@effect/experimental/RequestResolver"
import * as TimeToLive from "@effect/experimental/TimeToLive"
import { FileSystem, KeyValueStore } from "@effect/platform"
import { NodeContext } from "@effect/platform-node"
import { Schema } from "@effect/schema"
import * as it from "@effect/vitest"
import { Effect, Exit, Layer, PrimaryKey, ReadonlyArray, Request, RequestResolver, TestClock } from "effect"
import { assert, describe } from "vitest"

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

class TTLRequest extends Schema.TaggedRequest<TTLRequest>()("TTLRequest", Schema.string, User, {
  id: Schema.number
}) {
  [PrimaryKey.symbol]() {
    return `TTLRequest:${this.id}`
  }
  [TimeToLive.symbol](exit: Exit.Exit<User, string>) {
    return Exit.isSuccess(exit) ? 5000 : 1
  }
}

describe("RequestResolver", () => {
  describe("persisted", () => {
    const testsuite = (
      storeId: "memory" | "kvs" | "lmdb",
      layer: Layer.Layer<Persistence.ResultPersistence, unknown>
    ) =>
      it.effect(storeId, () =>
        Effect.gen(function*(_) {
          let count = 0
          const baseResolver = RequestResolver.makeBatched((reqs: Array<MyRequest | TTLRequest>) => {
            count += reqs.length
            return Effect.forEach(reqs, (req) => {
              if (req.id === -1) return Request.fail(req, "not found")
              return Request.succeed(req, new User({ id: req.id, name: "John" }))
            }, { discard: true })
          })
          const persisted = yield* _(RequestResolverX.persisted(baseResolver, storeId))
          let users = yield* _(
            Effect.forEach(ReadonlyArray.range(1, 5), (id) => Effect.request(new MyRequest({ id }), persisted), {
              batching: true
            })
          )
          assert.strictEqual(count, 5)
          assert.strictEqual(users.length, 5)
          users = yield* _(
            Effect.forEach(ReadonlyArray.range(1, 5), (id) => Effect.request(new MyRequest({ id }), persisted), {
              batching: true
            })
          )
          assert.strictEqual(count, 5)
          assert.strictEqual(users.length, 5)

          // ttl
          let results = yield* _(
            Effect.forEach(
              ReadonlyArray.range(-1, 3),
              (id) => Effect.exit(Effect.request(new TTLRequest({ id }), persisted)),
              {
                batching: true
              }
            )
          )
          assert.strictEqual(count, 10)
          assert.strictEqual(results.length, 5)
          assert(Exit.isFailure(results[0]))
          assert(Exit.isSuccess(results[1]))

          results = yield* _(
            Effect.forEach(
              ReadonlyArray.range(-1, 3),
              (id) => Effect.exit(Effect.request(new TTLRequest({ id }), persisted)),
              {
                batching: true
              }
            )
          )
          assert.strictEqual(count, 10)
          assert.strictEqual(results.length, 5)

          yield* _(TestClock.adjust(1))

          results = yield* _(
            Effect.forEach(
              ReadonlyArray.range(-1, 3),
              (id) => Effect.exit(Effect.request(new TTLRequest({ id }), persisted)),
              {
                batching: true
              }
            )
          )
          assert.strictEqual(count, 11)
          assert.strictEqual(results.length, 5)

          yield* _(TestClock.adjust(5000))

          results = yield* _(
            Effect.forEach(
              ReadonlyArray.range(-1, 3),
              (id) => Effect.exit(Effect.request(new TTLRequest({ id }), persisted)),
              {
                batching: true
              }
            )
          )
          assert.strictEqual(count, 16)
          assert.strictEqual(results.length, 5)

          // clear
          const persistence = yield* _(Persistence.ResultPersistence)
          const store = yield* _(persistence.make(storeId))
          yield* _(store.clear)

          users = yield* _(
            Effect.forEach(ReadonlyArray.range(1, 5), (id) => Effect.request(new MyRequest({ id }), persisted), {
              batching: true
            })
          )
          assert.strictEqual(count, 21)
          assert.strictEqual(users.length, 5)
        }).pipe(Effect.scoped, Effect.provide(layer)))

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
