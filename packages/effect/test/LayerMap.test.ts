import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import { Context, Effect, Exit, Layer, LayerMap, Scope, TestClock } from "effect"

class Value extends Context.Tag("LayerMap.test.Value")<Value, string>() {}

const trackedLayer = (events: Array<string>) =>
  Layer.scoped(
    Value,
    Effect.acquireRelease(
      Effect.sync(() => {
        events.push("acquire")
        return "value"
      }),
      () =>
        Effect.sync(() => {
          events.push("release")
        })
    )
  )

const constructors = {
  make: (layer: Layer.Layer<Value, Error>, idleTimeToLive?: number) =>
    Effect.map(
      LayerMap.make((_key: string) => layer, {
        preloadKeys: ["a"],
        ...(idleTimeToLive === undefined ? {} : { idleTimeToLive })
      }),
      (map) => Effect.asVoid(Effect.scoped(map.runtime("a")))
    ),
  fromRecord: (layer: Layer.Layer<Value, Error>, idleTimeToLive?: number) =>
    Effect.map(
      LayerMap.fromRecord({ a: layer }, {
        preload: true,
        ...(idleTimeToLive === undefined ? {} : { idleTimeToLive })
      }),
      (map) => Effect.asVoid(Effect.scoped(map.runtime("a")))
    ),
  "Service with lookup": (layer: Layer.Layer<Value, Error>, idleTimeToLive?: number) => {
    class MapService extends LayerMap.Service<MapService>()("LayerMap.test.Lookup", {
      lookup: (_key: string) => layer,
      preloadKeys: ["a"],
      ...(idleTimeToLive === undefined ? {} : { idleTimeToLive })
    }) {}
    return Effect.map(
      Layer.build(MapService.Default),
      (context) => Effect.asVoid(Effect.scoped(Context.get(context, MapService).runtime("a")))
    )
  },
  "Service with layers": (layer: Layer.Layer<Value, Error>, idleTimeToLive?: number) => {
    class MapService extends LayerMap.Service<MapService>()("LayerMap.test.Layers", {
      layers: { a: layer },
      preload: true,
      ...(idleTimeToLive === undefined ? {} : { idleTimeToLive })
    }) {}
    return Effect.map(
      Layer.build(MapService.Default),
      (context) => Effect.asVoid(Effect.scoped(Context.get(context, MapService).runtime("a")))
    )
  }
}

describe("LayerMap preload", () => {
  for (const [name, construct] of Object.entries(constructors)) {
    it.effect(`${name}: releases a preloaded entry after its idle TTL while the map remains open`, () =>
      Effect.gen(function*() {
        const events: Array<string> = []
        const scope = yield* Scope.make()
        const access = yield* construct(trackedLayer(events), 1000).pipe(Scope.extend(scope))

        deepStrictEqual(events, ["acquire"])
        yield* TestClock.adjust(500)
        deepStrictEqual(events, ["acquire"])
        yield* access
        deepStrictEqual(events, ["acquire"])
        yield* TestClock.adjust(1000)
        deepStrictEqual(events, ["acquire", "release"])
        yield* Scope.close(scope, Exit.void)
      }))

    it.effect(`${name}: does not acquire when the idle TTL is zero`, () =>
      Effect.gen(function*() {
        const events: Array<string> = []
        const scope = yield* Scope.make()
        yield* construct(trackedLayer(events), 0).pipe(Scope.extend(scope))
        deepStrictEqual(events, [])
        yield* Scope.close(scope, Exit.void)
        deepStrictEqual(events, [])
      }))

    it.effect(`${name}: does not acquire when the idle TTL is omitted`, () =>
      Effect.gen(function*() {
        const events: Array<string> = []
        const scope = yield* Scope.make()
        yield* construct(trackedLayer(events)).pipe(Scope.extend(scope))
        deepStrictEqual(events, [])
        yield* Scope.close(scope, Exit.void)
        deepStrictEqual(events, [])
      }))
  }

  it.effect("keeps an infinite-TTL preload until invalidation or map closure", () =>
    Effect.gen(function*() {
      const events: Array<string> = []
      const scope = yield* Scope.make()
      const map = yield* LayerMap.make(() => trackedLayer(events), {
        preloadKeys: ["a", "b"],
        idleTimeToLive: Infinity
      }).pipe(Scope.extend(scope))

      deepStrictEqual(events, ["acquire", "acquire"])
      yield* TestClock.adjust(1000)
      deepStrictEqual(events, ["acquire", "acquire"])
      yield* map.invalidate("a")
      deepStrictEqual(events, ["acquire", "acquire", "release"])
      yield* Scope.close(scope, Exit.void)
      deepStrictEqual(events, ["acquire", "acquire", "release", "release"])
    }))

  for (const [name, construct] of Object.entries(constructors)) {
    it.effect(`${name}: fails construction when a preload fails`, () =>
      Effect.gen(function*() {
        const failure = new Error("preload failed")
        const layer = Layer.effect(Value, Effect.fail(failure))
        const result = yield* Effect.scoped(construct(layer, 1000)).pipe(Effect.flip)
        deepStrictEqual(result, failure)
      }))
  }
})
