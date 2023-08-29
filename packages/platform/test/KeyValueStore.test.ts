import * as Option from "@effect/data/Option"
import * as Effect from "@effect/io/Effect"
import type * as Layer from "@effect/io/Layer"
import * as KeyValueStore from "@effect/platform/KeyValueStore"
import { afterEach } from "vitest"

export const testLayer = <E>(layer: Layer.Layer<never, E, KeyValueStore.KeyValueStore>) => {
  const run = <E, A>(effect: Effect.Effect<KeyValueStore.KeyValueStore, E, A>) =>
    Effect.runPromise(Effect.provideLayer(effect, layer))

  afterEach(() =>
    run(Effect.gen(function*(_) {
      const kv = yield* _(KeyValueStore.KeyValueStore)
      yield* _(kv.clear)
    }))
  )

  it("set", () =>
    run(Effect.gen(function*(_) {
      const kv = yield* _(KeyValueStore.KeyValueStore)
      yield* _(kv.set("/foo/bar", "bar"))

      const value = yield* _(kv.get("/foo/bar"))
      const length = yield* _(kv.size)

      expect(value).toEqual(Option.some("bar"))
      expect(length).toEqual(1)
    })))

  it("get/ missing", () =>
    run(Effect.gen(function*(_) {
      const kv = yield* _(KeyValueStore.KeyValueStore)
      yield* _(kv.clear)
      const value = yield* _(kv.get("foo"))

      expect(value).toEqual(Option.none())
    })))

  it("remove", () =>
    run(Effect.gen(function*(_) {
      const kv = yield* _(KeyValueStore.KeyValueStore)
      yield* _(kv.set("foo", "bar"))
      yield* _(kv.remove("foo"))

      const value = yield* _(kv.get("foo"))
      const length = yield* _(kv.size)

      expect(value).toEqual(Option.none())
      expect(length).toEqual(0)
    })))

  it("clear", () =>
    run(Effect.gen(function*(_) {
      const kv = yield* _(KeyValueStore.KeyValueStore)
      yield* _(kv.set("foo", "bar"))
      yield* _(kv.clear)

      const value = yield* _(kv.get("foo"))
      const length = yield* _(kv.size)

      expect(value).toEqual(Option.none())
      expect(length).toEqual(0)
    })))

  it("modify", () =>
    run(Effect.gen(function*(_) {
      const kv = yield* _(KeyValueStore.KeyValueStore)
      yield* _(kv.set("foo", "bar"))

      const value = yield* _(kv.modify("foo", (v) => v + "bar"))
      const length = yield* _(kv.size)

      expect(value).toEqual(Option.some("barbar"))
      expect(length).toEqual(1)
    })))

  it("modify - none", () =>
    run(Effect.gen(function*(_) {
      const kv = yield* _(KeyValueStore.KeyValueStore)

      const value = yield* _(kv.modify("foo", (v) => v + "bar"))
      const length = yield* _(kv.size)

      expect(value).toEqual(Option.none())
      expect(length).toEqual(0)
    })))
}

describe("KeyValueStore / layerMemory", () => testLayer(KeyValueStore.layerMemory))
