import { assert, describe, it } from "@effect/vitest"
import { Duration, Effect, Exit, Layer, LayerMap, Option, Scope } from "effect"
import { TestClock } from "effect/testing"

const makeLayer = (key: string, acquired: Array<string>, released: Array<string>): Layer.Layer<any> =>
  Layer.effectDiscard(
    Effect.acquireRelease(
      Effect.sync(() => {
        acquired.push(key)
      }),
      () =>
        Effect.sync(() => {
          released.push(key)
        })
    )
  ) as Layer.Layer<any>

describe("LayerMap", () => {
  it.effect("contextEffectOption does not build missing entries and returns existing entries", () =>
    Effect.gen(function*() {
      const acquired: Array<string> = []
      const layerMap = yield* LayerMap.make(
        (key: string) => Layer.effectDiscard(Effect.sync(() => acquired.push(key))) as Layer.Layer<any>
      )

      assert.deepStrictEqual(yield* layerMap.contextEffectOption("key"), Option.none())
      assert.deepStrictEqual(acquired, [])

      const ownerScope = yield* Scope.make()
      const borrowerScope = yield* Scope.make()
      yield* layerMap.contextEffect("key").pipe(Scope.provide(ownerScope))
      const cached = yield* layerMap.contextEffectOption("key").pipe(Scope.provide(borrowerScope))
      assert.isTrue(Option.isSome(cached))
      assert.deepStrictEqual(acquired, ["key"])

      yield* Scope.close(ownerScope, Exit.void)
      yield* Scope.close(borrowerScope, Exit.void)
    }))

  it.effect("Service contextEffectOption does not build missing entries and returns existing entries", () =>
    Effect.gen(function*() {
      const acquired: Array<string> = []
      class TestMap extends LayerMap.Service<TestMap>()("LayerMapTest/ContextEffectOption", {
        lookup: (key: string) => Layer.effectDiscard(Effect.sync(() => acquired.push(key))) as Layer.Layer<any>
      }) {}

      yield* Effect.gen(function*() {
        assert.deepStrictEqual(yield* TestMap.contextEffectOption("key"), Option.none())
        assert.deepStrictEqual(acquired, [])

        const ownerScope = yield* Scope.make()
        const borrowerScope = yield* Scope.make()
        yield* TestMap.contextEffect("key").pipe(Scope.provide(ownerScope))
        const cached = yield* TestMap.contextEffectOption("key").pipe(Scope.provide(borrowerScope))
        assert.isTrue(Option.isSome(cached))
        assert.deepStrictEqual(acquired, ["key"])

        yield* Scope.close(ownerScope, Exit.void)
        yield* Scope.close(borrowerScope, Exit.void)
      }).pipe(Effect.provide(TestMap.layer))
    }))

  it.effect("make does not preload with the default idle TTL", () =>
    Effect.gen(function*() {
      const acquired: Array<string> = []
      const released: Array<string> = []
      yield* LayerMap.make(
        (key: string) => makeLayer(key, acquired, released),
        { preloadKeys: ["a", "b"] }
      )

      assert.deepStrictEqual(acquired, [])
      assert.deepStrictEqual(released, [])
    }))

  it.effect("fromRecord does not preload with the default idle TTL", () =>
    Effect.gen(function*() {
      const acquired: Array<string> = []
      const released: Array<string> = []
      yield* LayerMap.fromRecord({
        a: makeLayer("a", acquired, released),
        b: makeLayer("b", acquired, released)
      }, { preload: true })
      assert.deepStrictEqual(acquired, [])
      assert.deepStrictEqual(released, [])
    }))

  it.effect("make skips an explicitly zero idle TTL even when preloading would fail", () =>
    Effect.gen(function*() {
      const layerMap = yield* LayerMap.make(
        (_key: string) => Layer.effectDiscard(Effect.fail("unexpected preload")) as Layer.Layer<any, string>,
        { preloadKeys: ["a"], idleTimeToLive: 0 }
      )
      assert.isTrue(Option.isNone(yield* layerMap.contextEffectOption("a")))
    }))

  it.effect("Service does not preload with the default idle TTL", () =>
    Effect.gen(function*() {
      const acquired: Array<string> = []
      const released: Array<string> = []
      class LookupMap extends LayerMap.Service<LookupMap>()("LayerMapTest/ZeroLookup", {
        lookup: (key: string) => makeLayer(key, acquired, released),
        preloadKeys: ["a", "b"]
      }) {}
      class RecordMap extends LayerMap.Service<RecordMap>()("LayerMapTest/ZeroRecord", {
        layers: { a: makeLayer("a", acquired, released), b: makeLayer("b", acquired, released) },
        preload: true
      }) {}
      yield* Effect.scoped(
        Effect.gen(function*() {
          yield* LookupMap
          yield* RecordMap
          assert.deepStrictEqual(acquired, [])
          assert.deepStrictEqual(released, [])
        }).pipe(Effect.provide([LookupMap.layer, RecordMap.layer]))
      )
    }))

  it.effect("make retains preloaded keys until their idle TTL expires", () =>
    Effect.gen(function*() {
      const acquired: Array<string> = []
      const released: Array<string> = []
      const layerMap = yield* LayerMap.make(
        (key: string) => makeLayer(key, acquired, released),
        { preloadKeys: ["a"], idleTimeToLive: 1000 }
      )
      assert.deepStrictEqual(acquired, ["a"])
      assert.deepStrictEqual(released, [])
      yield* Effect.scoped(layerMap.contextEffect("a"))
      assert.deepStrictEqual(acquired, ["a"])
      yield* TestClock.adjust(999)
      assert.deepStrictEqual(released, [])
      yield* TestClock.adjust(1)
      assert.deepStrictEqual(released, ["a"])
    }))

  it.effect("fromRecord retains preloaded keys until their idle TTL expires", () =>
    Effect.gen(function*() {
      const acquired: Array<string> = []
      const released: Array<string> = []
      const layerMap = yield* LayerMap.fromRecord(
        { a: makeLayer("a", acquired, released) },
        { preload: true, idleTimeToLive: 1000 }
      )
      assert.deepStrictEqual(acquired, ["a"])
      assert.deepStrictEqual(released, [])
      yield* Effect.scoped(layerMap.contextEffect("a"))
      assert.deepStrictEqual(acquired, ["a"])
      yield* TestClock.adjust(1000)
      assert.deepStrictEqual(released, ["a"])
    }))

  it.effect("make retains preloaded keys with infinite idle TTL", () =>
    Effect.gen(function*() {
      const acquired: Array<string> = []
      const released: Array<string> = []
      const layerMap = yield* LayerMap.make(
        (key: string) => makeLayer(key, acquired, released),
        { preloadKeys: ["a"], idleTimeToLive: Duration.infinity }
      )
      assert.deepStrictEqual(acquired, ["a"])
      yield* TestClock.adjust(1000)
      yield* Effect.scoped(layerMap.contextEffect("a"))
      assert.deepStrictEqual(acquired, ["a"])
      assert.deepStrictEqual(released, [])
    }))

  it.effect("make skips only keys with zero idle TTL", () =>
    Effect.gen(function*() {
      const acquired: Array<string> = []
      const released: Array<string> = []
      const layerMap = yield* LayerMap.make(
        (key: string) => makeLayer(key, acquired, released),
        { preloadKeys: ["zero", "kept"], idleTimeToLive: (key: string) => key === "zero" ? 0 : 1000 }
      )
      assert.deepStrictEqual(acquired, ["kept"])
      assert.deepStrictEqual(released, [])
      yield* Effect.scoped(layerMap.contextEffect("kept"))
      assert.deepStrictEqual(acquired, ["kept"])
      yield* TestClock.adjust(1000)
      assert.deepStrictEqual(released, ["kept"])
    }))

  it.effect("fromRecord skips only keys with zero idle TTL", () =>
    Effect.gen(function*() {
      const acquired: Array<string> = []
      const released: Array<string> = []
      yield* LayerMap.fromRecord(
        { zero: makeLayer("zero", acquired, released), kept: makeLayer("kept", acquired, released) },
        { preload: true, idleTimeToLive: (key) => key === "zero" ? 0 : 1000 }
      )
      assert.deepStrictEqual(acquired, ["kept"])
      yield* TestClock.adjust(1000)
      assert.deepStrictEqual(released, ["kept"])
    }))

  it.effect("Service skips only keys with zero idle TTL", () =>
    Effect.gen(function*() {
      const acquired: Array<string> = []
      const released: Array<string> = []
      class TestMap extends LayerMap.Service<TestMap>()("LayerMapTest/MixedPreload", {
        lookup: (key: string) => makeLayer(key, acquired, released),
        preloadKeys: ["zero", "kept"],
        idleTimeToLive: (key: string) => key === "zero" ? 0 : 1000
      }) {}
      yield* Effect.scoped(
        Effect.gen(function*() {
          yield* TestMap
          assert.deepStrictEqual(acquired, ["kept"])
          assert.deepStrictEqual(released, [])
          yield* Effect.scoped(TestMap.contextEffect("kept"))
          assert.deepStrictEqual(acquired, ["kept"])
          yield* TestClock.adjust(1000)
          assert.deepStrictEqual(released, ["kept"])
        }).pipe(Effect.provide(TestMap.layer))
      )
    }))

  it.effect("make fails construction when a non-zero TTL preload fails", () =>
    Effect.gen(function*() {
      const exit = yield* Effect.exit(LayerMap.make(
        (key: string) => Layer.effectDiscard(Effect.fail(key)) as Layer.Layer<any, string>,
        { preloadKeys: ["broken"], idleTimeToLive: 1000 }
      ))
      assert.isTrue(Exit.isFailure(exit))
    }))

  it.effect("make supports dynamic idleTimeToLive", () =>
    Effect.gen(function*() {
      const acquired: Array<string> = []
      const released: Array<string> = []
      const layerMap = yield* LayerMap.make(
        (key: string) => makeLayer(key, acquired, released),
        { idleTimeToLive: (key: string) => key.startsWith("short:") ? 500 : 2000 }
      )

      yield* Effect.scoped(layerMap.contextEffect("short:a"))
      yield* Effect.scoped(layerMap.contextEffect("long:b"))
      assert.deepStrictEqual(acquired, ["short:a", "long:b"])
      assert.deepStrictEqual(released, [])

      yield* TestClock.adjust(500)
      assert.deepStrictEqual(released, ["short:a"])

      yield* TestClock.adjust(1500)
      assert.deepStrictEqual(released, ["short:a", "long:b"])
    }))

  it.effect("fromRecord supports dynamic idleTimeToLive", () =>
    Effect.gen(function*() {
      const acquired: Array<string> = []
      const released: Array<string> = []
      const layers = {
        short: makeLayer("short", acquired, released),
        long: makeLayer("long", acquired, released)
      } as const
      const layerMap = yield* LayerMap.fromRecord(
        layers,
        {
          idleTimeToLive: (key) => {
            const key_: "short" | "long" = key
            return key_ === "short" ? 500 : 2000
          }
        }
      )

      yield* Effect.scoped(layerMap.contextEffect("short"))
      yield* Effect.scoped(layerMap.contextEffect("long"))
      assert.deepStrictEqual(acquired, ["short", "long"])
      assert.deepStrictEqual(released, [])

      yield* TestClock.adjust(500)
      assert.deepStrictEqual(released, ["short"])

      yield* TestClock.adjust(1500)
      assert.deepStrictEqual(released, ["short", "long"])
    }))

  it.effect("Service supports dynamic idleTimeToLive", () =>
    Effect.gen(function*() {
      const acquired: Array<string> = []
      const released: Array<string> = []

      class LookupMap extends LayerMap.Service<LookupMap>()("LayerMapTest/LookupMap", {
        lookup: (key: string) => makeLayer(key, acquired, released),
        idleTimeToLive: (key: string) => key.startsWith("short:") ? 500 : 2000
      }) {}

      class RecordMap extends LayerMap.Service<RecordMap>()("LayerMapTest/RecordMap", {
        layers: {
          short: makeLayer("short", acquired, released),
          long: makeLayer("long", acquired, released)
        },
        idleTimeToLive: (key) => {
          const key_: "short" | "long" = key
          return key_ === "short" ? 500 : 2000
        }
      }) {}

      yield* Effect.scoped(LookupMap.contextEffect("short:a").pipe(Effect.provide(LookupMap.layer)))
      yield* Effect.scoped(RecordMap.contextEffect("short").pipe(Effect.provide(RecordMap.layer)))
      assert.deepStrictEqual(acquired, ["short:a", "short"])

      yield* TestClock.adjust(500)
      assert.deepStrictEqual(released, ["short:a", "short"])
    }))
})
