import { assert, describe, it } from "@effect/vitest"
import { Context, Effect, Exit, Layer, LayerMap, Option } from "effect"

class Value extends Context.Service<Value, number>()("R5/MapRuntimeValue") {}
class Needed extends Context.Service<Needed, number>()("R5/MapRuntimeNeeded") {}
class BuildError {
  readonly _tag = "BuildError"
}

describe("LayerMap preload runtime controls", () => {
  it.effect("reuses a successful preload once, then idle invalidation permits a typed rebuild failure", () =>
    Effect.gen(function*() {
      let builds = 0
      const failure = new BuildError()
      const resource = Layer.effect(
        Value,
        Effect.gen(function*() {
          const value = yield* Needed
          return yield* ++builds === 1 ? Effect.succeed(value) : Effect.fail(failure)
        })
      )
      class Values extends LayerMap.Service<Values>()("R5/MapRuntimeFallible", {
        layers: { one: resource },
        dependencies: [Layer.succeed(Needed, 42)],
        preload: true,
        idleTimeToLive: Infinity
      }) {}

      yield* Effect.gen(function*() {
        assert.strictEqual(builds, 1)
        assert.strictEqual(Context.get(yield* Effect.scoped(Values.contextEffect("one")), Value), 42)
        assert.strictEqual(builds, 1)
        assert.isTrue(Option.isSome(yield* Effect.scoped(Values.contextEffectOption("one"))))
        yield* Values.invalidate("one")
        assert.deepStrictEqual(yield* Values.contextEffectOption("one"), Option.none())
        assert.strictEqual(builds, 1)
        assert.deepStrictEqual<Exit.Exit<Context.Context<Value>, BuildError>>(
          yield* Effect.exit(Values.contextEffect("one")),
          Exit.fail(failure)
        )
        assert.strictEqual(builds, 2)
      }).pipe(Effect.provide(Values.layer))
    }))

  it.effect("successful get reuse builds once and invalidated get rebuilds twice", () =>
    Effect.gen(function*() {
      let builds = 0
      class Values extends LayerMap.Service<Values>()("R5/MapRuntimeSuccess", {
        layers: { one: Layer.effect(Value, Effect.sync(() => ++builds)) },
        preload: true,
        idleTimeToLive: Infinity
      }) {}
      yield* Effect.gen(function*() {
        assert.strictEqual(yield* Effect.scoped(Value.pipe(Effect.provide(Values.get("one")))), 1)
        assert.strictEqual(builds, 1)
        yield* Values.invalidate("one")
        assert.strictEqual(yield* Effect.scoped(Value.pipe(Effect.provide(Values.get("one")))), 2)
        assert.strictEqual(builds, 2)
      }).pipe(Effect.provide(Values.layer))
    }))
})
