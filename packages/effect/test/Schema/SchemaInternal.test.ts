import * as util from "effect/internal/schema/util"
import { deepStrictEqual, strictEqual } from "effect/test/util"
import { describe, it } from "vitest"

describe("effect/internal/schema/util", () => {
  it("ownKeys", () => {
    deepStrictEqual(util.ownKeys({}), [])
    deepStrictEqual(util.ownKeys({ a: 1 }), ["a"])
    deepStrictEqual(util.ownKeys({ a: 1, b: 2 }), ["a", "b"])
    const a = Symbol.for("effect/Schema/test/a")
    const b = Symbol.for("effect/Schema/test/b")
    deepStrictEqual(util.ownKeys({ [a]: 3, [b]: 4 }), [a, b])
    deepStrictEqual(util.ownKeys({ a: 1, [a]: 3, b: 2, [b]: 4 }), ["a", "b", a, b])
  })

  describe("formatUnknown", () => {
    it("should format symbol property signatures", () => {
      strictEqual(util.formatUnknown({ [Symbol.for("a")]: 1 }), "{Symbol(a):1}")
    })

    it("should handle unexpected errors", () => {
      const circular: any = { a: null }
      circular.a = circular
      strictEqual(util.formatUnknown(circular), "[object Object]")
    })

    it("should detect data types with a custom `toString` implementation", () => {
      const noToString = { a: 1 }
      strictEqual(util.formatUnknown(noToString), `{"a":1}`)
      const ToString = Object.create({
        toString() {
          return "toString custom implementation"
        }
      })
      strictEqual(util.formatUnknown(ToString), "toString custom implementation")
      // should not detect arrays
      strictEqual(util.formatUnknown([1, 2, 3]), "[1,2,3]")
    })
  })
})
