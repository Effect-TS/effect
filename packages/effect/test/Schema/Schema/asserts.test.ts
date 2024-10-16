import * as ParseResult from "effect/ParseResult"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("asserts", () => {
  it("the returned error should be a ParseError", () => {
    const asserts: (u: unknown) => asserts u is string = S.asserts(S.String)
    try {
      asserts(1)
    } catch (e) {
      expect(ParseResult.isParseError(e)).toBe(true)
    }
  })

  it("should respect outer/inner options", () => {
    const schema = S.Struct({ a: Util.NumberFromChar })
    const input = { a: 1, b: "b" }
    expect(() => S.asserts(schema)(input, { onExcessProperty: "error" })).toThrow(
      new Error(`{ readonly a: number }
└─ ["b"]
   └─ is unexpected, expected: "a"`)
    )
    expect(() => S.asserts(schema, { onExcessProperty: "error" })(input)).toThrow(
      new Error(`{ readonly a: number }
└─ ["b"]
   └─ is unexpected, expected: "a"`)
    )
    expect(S.asserts(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }))
      .toEqual(undefined)
  })

  describe("struct", () => {
    it("required property signature", () => {
      const schema = S.Struct({ a: Util.NumberFromChar })
      Util.expectAssertsSuccess(schema, { a: 1 })
      Util.expectAssertsFailure(
        schema,
        { a: null },
        `{ readonly a: number }
└─ ["a"]
   └─ Expected number, actual null`
      )
    })

    it("required property signature with undefined", () => {
      const schema = S.Struct({ a: S.Union(S.Number, S.Undefined) })
      Util.expectAssertsSuccess(schema, { a: 1 })
      Util.expectAssertsSuccess(schema, { a: undefined })
      Util.expectAssertsSuccess(schema, { a: 1, b: "b" })

      Util.expectAssertsFailure(
        schema,
        {},
        `{ readonly a: number | undefined }
└─ ["a"]
   └─ is missing`
      )
      Util.expectAssertsFailure(schema, null, `Expected { readonly a: number | undefined }, actual null`)
      Util.expectAssertsFailure(
        schema,
        { a: "a" },
        `{ readonly a: number | undefined }
└─ ["a"]
   └─ number | undefined
      ├─ Expected number, actual "a"
      └─ Expected undefined, actual "a"`
      )
    })
  })
})
