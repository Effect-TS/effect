import * as util from "effect/internal/schema/util"
import { describe, expect, it } from "vitest"

describe("effect/internal/schema/util", () => {
  it("ownKeys", () => {
    expect(util.ownKeys({})).toStrictEqual([])
    expect(util.ownKeys({ a: 1 })).toStrictEqual(["a"])
    expect(util.ownKeys({ a: 1, b: 2 })).toStrictEqual(["a", "b"])
    const a = Symbol.for("effect/Schema/test/a")
    const b = Symbol.for("effect/Schema/test/b")
    expect(util.ownKeys({ [a]: 3, [b]: 4 })).toStrictEqual([a, b])
    expect(util.ownKeys({ a: 1, [a]: 3, b: 2, [b]: 4 })).toStrictEqual(["a", "b", a, b])
  })

  describe("formatUnknown", () => {
    it("should format symbol property signatures", () => {
      expect(util.formatUnknown({ [Symbol.for("a")]: 1 })).toEqual("{Symbol(a):1}")
    })

    it("should handle unexpected errors", () => {
      const circular: any = { a: null }
      circular.a = circular
      expect(util.formatUnknown(circular)).toEqual("[object Object]")
    })

    it("should detect data types with a custom `toString` implementation", () => {
      const noToString = { a: 1 }
      expect(util.formatUnknown(noToString)).toEqual(`{"a":1}`)
      const ToString = Object.create({
        toString() {
          return "toString custom implementation"
        }
      })
      expect(util.formatUnknown(ToString)).toEqual("toString custom implementation")
      // should not detect arrays
      expect(util.formatUnknown([1, 2, 3])).toEqual("[1,2,3]")
    })
  })
})
