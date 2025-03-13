import { describe, it } from "@effect/vitest"
import { Chunk } from "effect"
import * as util from "effect/internal/schema/util"
import { deepStrictEqual, strictEqual } from "effect/test/util"

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
    it("null", () => {
      strictEqual(util.formatUnknown(null), "null")
    })

    it("undefined", () => {
      strictEqual(util.formatUnknown(undefined), "undefined")
    })

    it("boolean", () => {
      strictEqual(util.formatUnknown(true), "true")
      strictEqual(util.formatUnknown(false), "false")
    })

    it("number", () => {
      strictEqual(util.formatUnknown(1), "1")
      strictEqual(util.formatUnknown(1.1), "1.1")
      strictEqual(util.formatUnknown(-1), "-1")
      strictEqual(util.formatUnknown(-1.1), "-1.1")
      strictEqual(util.formatUnknown(0), "0")
      strictEqual(util.formatUnknown(-0), "0")
      strictEqual(util.formatUnknown(NaN), "NaN")
      strictEqual(util.formatUnknown(Infinity), "Infinity")
      strictEqual(util.formatUnknown(-Infinity), "-Infinity")
    })

    it("bigint", () => {
      strictEqual(util.formatUnknown(1n), "1n")
      strictEqual(util.formatUnknown(-1n), "-1n")
      strictEqual(util.formatUnknown(0n), "0n")
      strictEqual(util.formatUnknown(-0n), "0n")
    })

    it("symbol", () => {
      const a = Symbol.for("effect/Schema/test/a")
      strictEqual(util.formatUnknown(a), "Symbol(effect/Schema/test/a)")
    })

    it("string", () => {
      strictEqual(util.formatUnknown(""), `""`)
      strictEqual(util.formatUnknown("a"), `"a"`)
      strictEqual(util.formatUnknown("ab"), `"ab"`)
      strictEqual(util.formatUnknown("abc"), `"abc"`)
    })

    it("array", () => {
      strictEqual(util.formatUnknown([]), "[]")
      strictEqual(util.formatUnknown([1]), "[1]")
      strictEqual(util.formatUnknown([1, 2]), "[1,2]")
      strictEqual(util.formatUnknown([1, 2, 3]), "[1,2,3]")
    })

    it("object", () => {
      strictEqual(util.formatUnknown({}), "{}")
      strictEqual(util.formatUnknown({ a: 1 }), `{"a":1}`)
      strictEqual(util.formatUnknown({ a: 1, b: 2 }), `{"a":1,"b":2}`)
      const a = Symbol.for("effect/Schema/test/a")
      strictEqual(util.formatUnknown({ [a]: 3 }), `{${String(a)}:3}`)
    })

    it("should format symbol property signatures", () => {
      strictEqual(util.formatUnknown({ [Symbol.for("a")]: 1 }), "{Symbol(a):1}")
    })

    it("should handle circular references", () => {
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

    it("Date", () => {
      strictEqual(util.formatUnknown(new Date("2024-01-01T00:00:00.000Z")), "2024-01-01T00:00:00.000Z")
    })

    it("iterables", () => {
      strictEqual(util.formatUnknown(new Set([])), "Set([])")
      strictEqual(util.formatUnknown(new Set([1, 2, 3])), "Set([1,2,3])")
      strictEqual(util.formatUnknown(new Map([])), "Map([])")
      strictEqual(util.formatUnknown(new Map([[1, "a"], [2, "b"], [3, "c"]])), `Map([[1,"a"],[2,"b"],[3,"c"]])`)
    })

    it("classes", () => {
      class A {
        constructor(readonly a: number) {}
      }
      strictEqual(util.formatUnknown(new A(1)), `A({"a":1})`)
    })

    it("Chunks", () => {
      strictEqual(
        util.formatUnknown(Chunk.make(1, 2, 3)),
        `{
  "_id": "Chunk",
  "values": [
    1,
    2,
    3
  ]
}`
      )
    })
  })
})
