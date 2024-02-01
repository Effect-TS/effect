import { formatUnknown } from "@effect/schema/AST"
import { format } from "@effect/schema/Schema"
import * as S from "@effect/schema/Schema"
import * as _ from "@effect/schema/TreeFormatter"
import { describe, expect, it } from "vitest"

describe("Format", () => {
  describe("format", () => {
    it("refinement", () => {
      const schema = S.string.pipe(S.minLength(2))
      expect(format(schema)).toEqual("a string at least 2 character(s) long")
    })

    it("union", () => {
      const schema = S.union(S.string, S.string.pipe(S.minLength(2)))
      expect(format(schema)).toEqual(
        "a string at least 2 character(s) long | string"
      )
    })

    it("suspend", () => {
      type A = readonly [number, A | null]
      const schema: S.Schema<A> = S.suspend( // intended outer suspend
        () => S.tuple(S.number, S.union(schema, S.literal(null)))
      )
      expect(format(schema)).toEqual("<suspended schema>")
    })

    it("suspend before initialization", () => {
      const schema = S.suspend(() => string)
      expect(format(schema)).toEqual("<suspended schema>")
      const string = S.string
    })
  })

  describe("formatUnknown", () => {
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
})
