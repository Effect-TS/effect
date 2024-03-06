import { describe, expect, it } from "vitest"
import { formatUnknown } from "../src/internal/util.js"

describe("util > formatUnknown", () => {
  it("should format symbol property signatures", () => {
    expect(formatUnknown({ [Symbol.for("a")]: 1 })).toEqual("{Symbol(a):1}")
  })

  it("should handle unexpected errors", () => {
    const circular: any = { a: null }
    circular.a = circular
    expect(formatUnknown(circular)).toEqual("[object Object]")
  })

  it("should detect data types with a custom `toString` implementation", () => {
    const noToString = { a: 1 }
    expect(formatUnknown(noToString)).toEqual(`{"a":1}`)
    const ToString = Object.create({
      toString() {
        return "toString custom implementation"
      }
    })
    expect(formatUnknown(ToString)).toEqual("toString custom implementation")
    // should not detect arrays
    expect(formatUnknown([1, 2, 3])).toEqual("[1,2,3]")
  })
})
