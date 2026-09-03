import type { Context, Effect, Layer, LayerMap, Option, Scope } from "effect"
import { describe, expect, it } from "tstyche"
import {
  type BuildError,
  type DependencyError,
  type DependencyInput,
  Dynamic,
  explicit,
  FalsePreload,
  get,
  type instance,
  Lazy,
  type Needed,
  optional,
  Preloaded,
  read,
  type record,
  type Remaining,
  Success,
  type Value
} from "./LayerMap.preload.producer.ts"

describe("LayerMap preload keeps future acquisition errors", () => {
  it("public calls and inferred producer outputs", () => {
    expect(get).type.toBe<Layer.Layer<Value, BuildError, Preloaded>>()
    expect(read).type.toBe<Effect.Effect<Context.Context<Value>, BuildError, Scope.Scope | Preloaded>>()
    expect(optional).type.toBe<
      Effect.Effect<Option.Option<Context.Context<Value>>, BuildError, Scope.Scope | Preloaded>
    >()
    expect<Effect.Success<typeof instance>>().type.toBe<LayerMap.LayerMap<"one" | "two", Value, BuildError>>()
    expect(read).type.not.toBeAssignableTo<Effect.Effect<Context.Context<Value>, never, Scope.Scope | Preloaded>>()
  })

  it("constructor error, dependencies, requirements, keys, and output survive", () => {
    expect(Preloaded.layer).type.toBe<
      Layer.Layer<Preloaded, BuildError | DependencyError, Remaining | DependencyInput>
    >()
    expect(Preloaded.layerNoDeps).type.toBe<Layer.Layer<Preloaded, BuildError, Needed | Remaining>>()
    expect(Preloaded.get).type.toBeCallableWith("one")
    expect(Preloaded.get).type.toBeCallableWith("two")
    expect(Preloaded.get).type.not.toBeCallableWith("missing")
    expect(Preloaded.contextEffect).type.not.toBeCallableWith(123)
    expect(Preloaded.invalidate("one")).type.toBe<Effect.Effect<void, never, Preloaded>>()
    expect(Preloaded.key).type.toBe<"R5/MapPreloaded">()
  })

  it("fromRecord is a discriminating sibling", () => {
    expect<Effect.Success<typeof record>>().type.toBe<LayerMap.LayerMap<"one" | "two", Value, BuildError>>()
    expect<Effect.Error<typeof record>>().type.toBe<BuildError>()
    expect<Effect.Services<typeof record>>().type.toBe<Scope.Scope | Needed | Remaining>()
  })

  it("lazy, false, success, and explicit generic controls", () => {
    expect(Lazy.get("one")).type.toBe<Layer.Layer<Value, BuildError, Lazy>>()
    expect(Lazy.layer).type.toBe<Layer.Layer<Lazy, never, Needed | Remaining>>()
    expect(FalsePreload.get("one")).type.toBe<Layer.Layer<Value, BuildError, FalsePreload>>()
    expect(FalsePreload.layer).type.toBe<Layer.Layer<FalsePreload, never, Needed | Remaining>>()
    expect(Success.get("one")).type.toBe<Layer.Layer<Value, never, Success>>()
    expect(Success.layer).type.toBe<Layer.Layer<Success>>()
    expect(explicit.layer).type.toBe<Layer.Layer<Lazy, never, Needed | Remaining>>()
  })

  it("dynamic lookup with preloadKeys remains fallible", () => {
    expect(Dynamic.get("one")).type.toBe<Layer.Layer<Value, BuildError, Dynamic>>()
    expect(Dynamic.layer).type.toBe<Layer.Layer<Dynamic, BuildError | DependencyError, Remaining | DependencyInput>>()
    expect(Dynamic.layerNoDeps).type.toBe<Layer.Layer<Dynamic, BuildError, Needed | Remaining>>()
    expect(Dynamic.contextEffectOption("two")).type.toBe<
      Effect.Effect<Option.Option<Context.Context<Value>>, BuildError, Scope.Scope | Dynamic>
    >()
  })
})
