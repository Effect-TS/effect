import { Effect, Effectable } from "effect"
import { describe, expect, it } from "tstyche"

describe("Effectable.Mixin", () => {
  class Box {
    constructor(readonly value: number) {}
  }

  class EffectBox extends Effectable.Mixin(Box) {
    override override = Effect.succeed(this.value.toString())
  }

  class FullEffectBox extends Effectable.Mixin(Box) {
    override override = undefined as unknown as Effect.Effect<"success", "error", "service">
  }

  it("preserves constructor parameters", () => {
    expect<ConstructorParameters<typeof EffectBox>>().type.toBe<[value: number]>()
  })

  it("instances are Effects of the override success type and original class instances", () => {
    expect<Effect.Success<EffectBox>>().type.toBe<string>()
    expect(new EffectBox(1)).type.toBeAssignableTo<Effect.Effect<string>>()
    expect(new EffectBox(1)).type.toBeAssignableTo<Box>()
  })

  it("propagates success, error, and services through yield*", () => {
    const effect = Effect.gen(function*() {
      return yield* new FullEffectBox(1)
    })
    expect(effect).type.toBe<Effect.Effect<"success", "error", "service">>()
  })

  it("requires override", () => {
    // @ts-expect-error does not implement inherited abstract member override
    class MissingOverride extends Effectable.Mixin(Box) {}
  })
})
