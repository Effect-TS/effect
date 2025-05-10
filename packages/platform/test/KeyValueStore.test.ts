import * as KeyValueStore from "@effect/platform/KeyValueStore"
import { afterEach, describe, it } from "@effect/vitest"
import { assertNone, assertSome, assertTrue, strictEqual } from "@effect/vitest/utils"
import { Effect, identity, Layer, pipe, Schema } from "effect"

export const testLayer = <E>(layer: Layer.Layer<KeyValueStore.KeyValueStore, E>) => {
  const run = <E, A>(effect: Effect.Effect<A, E, KeyValueStore.KeyValueStore>) =>
    Effect.runPromise(Effect.provide(effect, layer))

  afterEach(() =>
    run(Effect.gen(function*() {
      const kv = yield* (KeyValueStore.KeyValueStore)
      yield* (kv.clear)
    }))
  )

  it("set", () =>
    run(Effect.gen(function*() {
      const kv = yield* (KeyValueStore.KeyValueStore)
      yield* (kv.set("/foo/bar", "bar"))

      const value = yield* (kv.get("/foo/bar"))
      const length = yield* (kv.size)

      assertSome(value, "bar")
      strictEqual(length, 1)
    })))

  it("get/ missing", () =>
    run(Effect.gen(function*() {
      const kv = yield* (KeyValueStore.KeyValueStore)
      yield* (kv.clear)
      const value = yield* (kv.get("foo"))

      assertNone(value)
    })))

  it("remove", () =>
    run(Effect.gen(function*() {
      const kv = yield* (KeyValueStore.KeyValueStore)
      yield* (kv.set("foo", "bar"))
      yield* (kv.remove("foo"))

      const value = yield* (kv.get("foo"))
      const length = yield* (kv.size)

      assertNone(value)
      strictEqual(length, 0)
    })))

  it("clear", () =>
    run(Effect.gen(function*() {
      const kv = yield* (KeyValueStore.KeyValueStore)
      yield* (kv.set("foo", "bar"))
      yield* (kv.clear)

      const value = yield* (kv.get("foo"))
      const length = yield* (kv.size)

      assertNone(value)
      strictEqual(length, 0)
    })))

  it("modify", () =>
    run(Effect.gen(function*() {
      const kv = yield* (KeyValueStore.KeyValueStore)
      yield* (kv.set("foo", "bar"))

      const value = yield* (kv.modify("foo", (v) => v + "bar"))
      const length = yield* (kv.size)

      assertSome(value, "barbar")
      strictEqual(length, 1)
    })))

  it("modify - none", () =>
    run(Effect.gen(function*() {
      const kv = yield* (KeyValueStore.KeyValueStore)

      const value = yield* (kv.modify("foo", (v) => v + "bar"))
      const length = yield* (kv.size)

      assertNone(value)
      strictEqual(length, 0)
    })))
}

describe("KeyValueStore / layerMemory", () => testLayer(KeyValueStore.layerMemory))

describe("KeyValueStore / prefix", () => {
  it("prefixes the keys", () =>
    Effect.gen(function*() {
      const store = yield* (KeyValueStore.KeyValueStore)
      const prefixed = KeyValueStore.prefix(store, "prefix/")

      yield* (prefixed.set("foo", "bar"))
      yield* (prefixed.modify("foo", (v) => v + "bar"))

      assertSome(yield* (prefixed.get("foo")), "barbar")
      assertTrue(yield* (prefixed.has("foo")))

      assertSome(yield* (store.get("prefix/foo")), "barbar")
      assertTrue(yield* (store.has("prefix/foo")))
    }).pipe(
      Effect.provide(KeyValueStore.layerMemory),
      Effect.runPromise
    ))
})

class User extends Schema.Class<User>("User")({
  name: Schema.String,
  age: Schema.Number
}) {}
const UserStore = KeyValueStore.layerSchema(User, "UserStore")
const runUserStore = <E, A>(effect: Effect.Effect<A, E, KeyValueStore.SchemaStore<User, never>>) =>
  Effect.runPromise(Effect.provide(effect, UserStore.layer.pipe(Layer.provide(KeyValueStore.layerMemory))))

describe("KeyValueStore / SchemaStore", () => {
  it("encodes & decodes", () =>
    runUserStore(Effect.gen(function*() {
      const store = yield* (UserStore.tag)
      yield* (store.set("foo", new User({ name: "foo", age: 42 })))
      yield* (store.modify("foo", (user) => new User({ ...user, age: 43 })))
      const value = yield* pipe(store.get("foo"), Effect.flatMap(identity))

      strictEqual(value.name, "foo")
      strictEqual(value.age, 43)
    })))

  it("prefix", () =>
    runUserStore(Effect.gen(function*() {
      const store = yield* (UserStore.tag)
      const prefixed = KeyValueStore.prefix(store, "prefix/")
      yield* (prefixed.set("foo", new User({ name: "foo", age: 42 })))
      const value = yield* pipe(store.get("prefix/foo"), Effect.flatMap(identity))

      strictEqual(value.name, "foo")
      strictEqual(value.age, 42)
    })))
})
