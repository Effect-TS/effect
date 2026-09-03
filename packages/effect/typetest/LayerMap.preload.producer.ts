import { Context, Effect, Layer, LayerMap } from "effect"

export class Value extends Context.Service<Value, number>()("R5/MapValue") {}
export class Needed extends Context.Service<Needed, number>()("R5/MapNeeded") {}
export class Remaining extends Context.Service<Remaining, number>()("R5/MapRemaining") {}
export class DependencyInput extends Context.Service<DependencyInput, number>()("R5/MapDependencyInput") {}
export class BuildError {
  readonly _tag = "BuildError"
}
export class DependencyError {
  readonly _tag = "DependencyError"
}

export const resource = Layer.effect(
  Value,
  Effect.gen(function*() {
    yield* Needed
    yield* Remaining
    return yield* Effect.fail(new BuildError())
  })
)
export const dependency = Layer.effect(
  Needed,
  Effect.gen(function*() {
    yield* DependencyInput
    return yield* Effect.fail(new DependencyError())
  })
)
export const layers = { one: resource, two: resource }

export class Preloaded extends LayerMap.Service<Preloaded>()("R5/MapPreloaded", {
  layers,
  preload: true,
  dependencies: [dependency],
  idleTimeToLive: Infinity
}) {}
export class Lazy extends LayerMap.Service<Lazy>()("R5/MapLazy", { layers }) {}
export class FalsePreload extends LayerMap.Service<FalsePreload>()("R5/MapFalse", { layers, preload: false }) {}
export class Success extends LayerMap.Service<Success>()("R5/MapSuccess", {
  layers: { one: Layer.succeed(Value, 1) },
  preload: true
}) {}
export class Dynamic extends LayerMap.Service<Dynamic>()("R5/MapDynamic", {
  lookup: (_key: "one" | "two") => resource,
  preloadKeys: ["one"],
  dependencies: [dependency]
}) {}
export const record = LayerMap.fromRecord(layers, { preload: true })
export const explicit = LayerMap.Service<Lazy>()<"R5/MapExplicit", { layers: typeof layers }>(
  "R5/MapExplicit",
  { layers }
)
export const get = Preloaded.get("one")
export const read = Preloaded.contextEffect("two")
export const optional = Preloaded.contextEffectOption("one")
export const instance = Effect.map(Preloaded, (map) => map)
