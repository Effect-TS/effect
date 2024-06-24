import * as KeyValueStore from "@effect/platform/KeyValueStore"
import * as Schema from "@effect/schema/Schema"
import * as Effect from "effect/Effect"
import { identity, pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import { afterEach, describe, expect, it } from "vitest"

export const testLayer = <E>(layer: Layer.Layer<KeyValueStore.KeyValueStore, E>) => {
  const run = <E, A>(effect: Effect.Effect<A, E, KeyValueStore.KeyValueStore>) =>
    Effect.runPromise(Effect.provide(effect, layer))

  afterEach(() =>
    run(Effect.gen(function*(_) {
      const kv = yield* KeyValueStore.KeyValueStore
      yield* kv.clear
    }))
  )

  it("set", () =>
    run(Effect.gen(function*(_) {
      const kv = yield* KeyValueStore.KeyValueStore
      yield* kv.set("/foo/bar", "bar")

      const value = yield* kv.get("/foo/bar")
      const length = yield* kv.size

      expect(value).toEqual(Option.some("bar"))
      expect(length).toEqual(1)
    })))

  it("get/ missing", () =>
    run(Effect.gen(function*(_) {
      const kv = yield* KeyValueStore.KeyValueStore
      yield* kv.clear
      const value = yield* kv.get("foo")

      expect(value).toEqual(Option.none())
    })))

  it("remove", () =>
    run(Effect.gen(function*(_) {
      const kv = yield* KeyValueStore.KeyValueStore
      yield* kv.set("foo", "bar")
      yield* kv.remove("foo")

      const value = yield* kv.get("foo")
      const length = yield* kv.size

      expect(value).toEqual(Option.none())
      expect(length).toEqual(0)
    })))

  it("clear", () =>
    run(Effect.gen(function*(_) {
      const kv = yield* KeyValueStore.KeyValueStore
      yield* kv.set("foo", "bar")
      yield* kv.clear

      const value = yield* kv.get("foo")
      const length = yield* kv.size

      expect(value).toEqual(Option.none())
      expect(length).toEqual(0)
    })))

  it("modify", () =>
    run(Effect.gen(function*(_) {
      const kv = yield* KeyValueStore.KeyValueStore
      yield* kv.set("foo", "bar")

      const value = yield* kv.modify("foo", (v) => v + "bar")
      const length = yield* kv.size

      expect(value).toEqual(Option.some("barbar"))
      expect(length).toEqual(1)
    })))

  it("modify - none", () =>
    run(Effect.gen(function*(_) {
      const kv = yield* KeyValueStore.KeyValueStore

      const value = yield* kv.modify("foo", (v) => v + "bar")
      const length = yield* kv.size

      expect(value).toEqual(Option.none())
      expect(length).toEqual(0)
    })))
}

describe("KeyValueStore / layerMemory", () => testLayer(KeyValueStore.layerMemory))

describe("KeyValueStore / prefix", () => {
  it("prefixes the keys", () =>
    Effect.gen(function*(_) {
      const store = yield* KeyValueStore.KeyValueStore
      const prefixed = KeyValueStore.prefix(store, "prefix/")

      yield* prefixed.set("foo", "bar")
      yield* prefixed.modify("foo", (v) => v + "bar")

      expect(yield* prefixed.get("foo")).toEqual(Option.some("barbar"))
      expect(yield* prefixed.has("foo")).toEqual(true)

      expect(yield* store.get("prefix/foo")).toEqual(Option.some("barbar"))
      expect(yield* store.has("prefix/foo")).toEqual(true)
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
    runUserStore(Effect.gen(function*(_) {
      const store = yield* UserStore.tag
      yield* store.set("foo", new User({ name: "foo", age: 42 }))
      yield* store.modify("foo", (user) => new User({ ...user, age: 43 }))
      const value = yield* pipe(store.get("foo"), Effect.flatMap(identity))

      expect(value.name).toEqual("foo")
      expect(value.age).toEqual(43)
    })))

  it("prefix", () =>
    runUserStore(Effect.gen(function*(_) {
      const store = yield* UserStore.tag
      const prefixed = KeyValueStore.prefix(store, "prefix/")
      yield* prefixed.set("foo", new User({ name: "foo", age: 42 }))
      const value = yield* pipe(store.get("prefix/foo"), Effect.flatMap(identity))

      expect(value.name).toEqual("foo")
      expect(value.age).toEqual(42)
    })))
})
