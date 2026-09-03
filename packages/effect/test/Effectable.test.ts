import { assert, describe, it } from "@effect/vitest"
import { Effect, Effectable } from "effect"

describe("Effectable", () => {
  describe("Mixin", () => {
    class Box {
      constructor(readonly value: number) {}
      double() {
        return this.value * 2
      }
    }

    class EffectBox extends Effectable.Mixin(Box) {
      override = Effect.succeed(this.value)
    }

    it.effect("evaluates override", () =>
      Effect.gen(function*() {
        const effectValue = yield* new EffectBox(1)
        assert.strictEqual(effectValue, 2)
      }))

    it("inserts the Effect prototype between the subclass and original class", () => {
      const box = new EffectBox(1)
      const protos: Array<object> = []
      let current: object | null = Object.getPrototypeOf(box)
      while (current !== null && current !== Box.prototype) {
        protos.push(current)
        current = Object.getPrototypeOf(current)
      }
      assert.strictEqual(current, Box.prototype)
      assert.isTrue(protos.some((proto) => Effect.TypeId in proto))
    })

    it("preserves the original constructor and instance members", () => {
      const box = new EffectBox(2)
      assert.isTrue(box instanceof EffectBox)
      assert.isTrue(box instanceof Box)
      assert.strictEqual(box.constructor, EffectBox)
      assert.strictEqual(box.value, 2)
      assert.strictEqual(box.double(), 4)
    })

    it("makes instances behave as Effects", () => {
      const box = new EffectBox(3)
      assert.isTrue(Effect.isEffect(box))
      assert.strictEqual(box.pipe((b) => b.value), 3)
    })

    it("does not modify the original class prototype", () => {
      assert.isFalse(Effect.TypeId in Box.prototype)
      assert.isFalse(Effect.isEffect(new Box(1)))
    })
  })
})
