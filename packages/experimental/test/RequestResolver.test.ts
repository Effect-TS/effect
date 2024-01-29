import * as Persistence from "@effect/experimental/Persistence"
import * as PersistenceLmdb from "@effect/experimental/Persistence/Lmdb"
import * as RequestResolverX from "@effect/experimental/RequestResolver"
import { FileSystem } from "@effect/platform-node"
import * as KeyValueStore from "@effect/platform-node/KeyValueStore"
import { Schema } from "@effect/schema"
import { Effect, Layer, PrimaryKey, ReadonlyArray, RequestResolver } from "effect"
import { assert, describe, test } from "vitest"

describe("RequestResolver", () => {
  describe("persisted", () => {
    class User extends Schema.Class<User>()({
      id: Schema.number,
      name: Schema.string
    }) {}
    class MyRequest extends Schema.TaggedRequest<MyRequest>()("MyRequest", Schema.string, User, {
      id: Schema.number
    }) {
      [PrimaryKey.symbol]() {
        return String(this.id)
      }
    }

    test("memory", () =>
      Effect.gen(function*(_) {
        const baseResolver = RequestResolver.fromEffectTagged<MyRequest>()({
          MyRequest: (reqs) => Effect.succeed(ReadonlyArray.map(reqs, (req) => new User({ id: req.id, name: "John" })))
        })
        const persisted = yield* _(RequestResolverX.persisted(baseResolver, "memory"))
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
      }).pipe(Effect.scoped, Effect.provide(Persistence.layerResultMemory), Effect.runPromise))

    test("key value store", () =>
      Effect.gen(function*(_) {
        const baseResolver = RequestResolver.fromEffectTagged<MyRequest>()({
          MyRequest: (reqs) => Effect.succeed(ReadonlyArray.map(reqs, (req) => new User({ id: req.id, name: "John" })))
        })
        const persised = yield* _(RequestResolverX.persisted(baseResolver, "kvs"))
        let users = yield* _(
          Effect.forEach(ReadonlyArray.range(1, 5), (id) => Effect.request(new MyRequest({ id }), persised), {
            batching: true
          })
        )
        assert.strictEqual(users.length, 5)
        users = yield* _(
          Effect.forEach(ReadonlyArray.range(1, 5), (id) => Effect.request(new MyRequest({ id }), persised), {
            batching: true
          })
        )
        assert.strictEqual(users.length, 5)
      }).pipe(
        Effect.scoped,
        Effect.provide(Persistence.layerResultKeyValueStore.pipe(Layer.provide(KeyValueStore.layerMemory))),
        Effect.runPromise
      ))

    test("lmdb", () =>
      Effect.gen(function*(_) {
        const fs = yield* _(FileSystem.FileSystem)
        const dir = yield* _(fs.makeTempDirectoryScoped())

        yield* _(
          Effect.gen(function*(_) {
            const baseResolver = RequestResolver.fromEffectTagged<MyRequest>()({
              MyRequest: (reqs) =>
                Effect.succeed(ReadonlyArray.map(reqs, (req) => new User({ id: req.id, name: "John" })))
            })
            const persised = yield* _(RequestResolverX.persisted(baseResolver, "lmbd"))
            let users = yield* _(
              Effect.forEach(ReadonlyArray.range(1, 5), (id) => Effect.request(new MyRequest({ id }), persised), {
                batching: true
              })
            )
            assert.strictEqual(users.length, 5)
            users = yield* _(
              Effect.forEach(ReadonlyArray.range(1, 5), (id) => Effect.request(new MyRequest({ id }), persised), {
                batching: true
              })
            )
            assert.strictEqual(users.length, 5)
          }),
          Effect.scoped,
          Effect.provide(PersistenceLmdb.layerResult({ path: dir }))
        )
      }).pipe(
        Effect.scoped,
        Effect.provide(FileSystem.layer),
        Effect.runPromise
      ))
  })
})
