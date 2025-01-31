import * as Persistence from "@effect/experimental/Persistence"
import * as RequestResolverX from "@effect/experimental/RequestResolver"
import { KeyValueStore } from "@effect/platform"
import { assert, describe, it } from "@effect/vitest"
import { Array, Effect, Exit, Layer, PrimaryKey, Request, RequestResolver, Schema, TestClock } from "effect"
import type { NonEmptyArray } from "effect/Array"

class User extends Schema.Class<User>("User")({
  id: Schema.Number,
  name: Schema.String
}) {}

class MyRequest extends Schema.TaggedRequest<MyRequest>()("MyRequest", {
  failure: Schema.String,
  success: User,
  payload: {
    id: Schema.Number
  }
}) {
  [PrimaryKey.symbol]() {
    return `MyRequest:${this.id}`
  }
}

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
  // [TimeToLive.symbol](exit: Exit.Exit<User, string>) {
  //   return Exit.isSuccess(exit) ? 5000 : 1
  // }
}

describe("RequestResolver", () => {
  describe("persisted", () => {
    const testsuite = (
      storeId: "memory" | "kvs" | "lmdb",
      layer: Layer.Layer<Persistence.ResultPersistence, unknown>
    ) =>
      it.effect(storeId, () =>
        Effect.gen(function*() {
          let count = 0
          const baseResolver = RequestResolver.makeBatched((reqs: NonEmptyArray<MyRequest | TTLRequest>) => {
            count += reqs.length
            return Effect.forEach(reqs, (req) => {
              if (req.id === -1) return Request.fail(req, "not found")
              return Request.succeed(req, new User({ id: req.id, name: "John" }))
            }, { discard: true })
          })
          const persisted = yield* RequestResolverX.persisted(baseResolver, {
            storeId,
            timeToLive: (_req, exit) => Exit.isSuccess(exit) ? 5000 : 1
          })
          let users = yield* Effect.forEach(
            Array.range(1, 5),
            (id) => Effect.request(new MyRequest({ id }), persisted),
            {
              batching: true
            }
          )
          assert.strictEqual(count, 5)
          assert.strictEqual(users.length, 5)
          users = yield* Effect.forEach(Array.range(1, 5), (id) => Effect.request(new MyRequest({ id }), persisted), {
            batching: true
          })
          assert.strictEqual(count, 5)
          assert.strictEqual(users.length, 5)

          // ttl
          let results = yield* Effect.forEach(
            Array.range(-1, 3),
            (id) => Effect.exit(Effect.request(new TTLRequest({ id }), persisted)),
            {
              batching: true
            }
          )

          assert.strictEqual(count, 10)
          assert.strictEqual(results.length, 5)
          assert(Exit.isFailure(results[0]))
          assert(Exit.isSuccess(results[1]))

          results = yield* Effect.forEach(
            Array.range(-1, 3),
            (id) => Effect.exit(Effect.request(new TTLRequest({ id }), persisted)),
            {
              batching: true
            }
          )
          assert.strictEqual(count, 10)
          assert.strictEqual(results.length, 5)

          yield* TestClock.adjust(1)

          results = yield* Effect.forEach(
            Array.range(-1, 3),
            (id) => Effect.exit(Effect.request(new TTLRequest({ id }), persisted)),
            {
              batching: true
            }
          )
          assert.strictEqual(count, 11)
          assert.strictEqual(results.length, 5)

          yield* TestClock.adjust(5000)

          results = yield* Effect.forEach(
            Array.range(-1, 3),
            (id) => Effect.exit(Effect.request(new TTLRequest({ id }), persisted)),
            {
              batching: true
            }
          )
          assert.strictEqual(count, 16)
          assert.strictEqual(results.length, 5)

          // clear
          const persistence = yield* Persistence.ResultPersistence
          const store = yield* persistence.make({ storeId })
          yield* store.clear

          users = yield* Effect.forEach(Array.range(1, 5), (id) => Effect.request(new MyRequest({ id }), persisted), {
            batching: true
          })
          assert.strictEqual(count, 21)
          assert.strictEqual(users.length, 5)
        }).pipe(Effect.scoped, Effect.provide(layer)))

    testsuite("memory", Persistence.layerResultMemory)
    testsuite("kvs", Persistence.layerResultKeyValueStore.pipe(Layer.provide(KeyValueStore.layerMemory)))
    // testsuite(
    //   "lmdb",
    //   Effect.gen(function*(_) {
    //     const fs = yield* _(FileSystem.FileSystem)
    //     const dir = yield* _(fs.makeTempDirectoryScoped())
    //     return PersistenceLmdb.layerResult({ path: dir })
    //   }).pipe(Layer.unwrapScoped, Layer.provide(NodeContext.layer))
    // )
  })
})
