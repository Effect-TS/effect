import { describe, it } from "@effect/vitest"
import { assertTrue, strictEqual } from "@effect/vitest/utils"
import * as ParseResult from "effect/ParseResult"
import * as S from "effect/Schema"
import * as Util from "../TestUtils.js"

describe("asserts", () => {
  it("the returned error should be a ParseError", () => {
    const asserts: (u: unknown) => asserts u is string = S.asserts(S.String)
    try {
      asserts(1)
    } catch (e) {
      assertTrue(ParseResult.isParseError(e))
    }
  })

  it("should respect outer/inner options", () => {
    const schema = S.Struct({ a: Util.NumberFromChar })
    const input = { a: 1, b: "b" }
    Util.assertions.parseError(
      () => S.asserts(schema)(input, { onExcessProperty: "error" }),
      `{ readonly a: number }
└─ ["b"]
   └─ is unexpected, expected: "a"`
    )
    Util.assertions.parseError(
      () => S.asserts(schema, { onExcessProperty: "error" })(input),
      `{ readonly a: number }
└─ ["b"]
   └─ is unexpected, expected: "a"`
    )
    strictEqual(S.asserts(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }), undefined)
  })

  describe("struct", () => {
    it("required property signature", () => {
      const schema = S.Struct({ a: Util.NumberFromChar })
      Util.assertions.asserts.succeed(schema, { a: 1 })
      Util.assertions.asserts.fail(
        schema,
        { a: null },
        `{ readonly a: number }
└─ ["a"]
   └─ Expected number, actual null`
      )
    })

    it("required property signature with undefined", () => {
      const schema = S.Struct({ a: S.Union(S.Number, S.Undefined) })
      Util.assertions.asserts.succeed(schema, { a: 1 })
      Util.assertions.asserts.succeed(schema, { a: undefined })
      Util.assertions.asserts.succeed(schema, { a: 1, b: "b" })

      Util.assertions.asserts.fail(
        schema,
        {},
        `{ readonly a: number | undefined }
└─ ["a"]
   └─ is missing`
      )
      Util.assertions.asserts.fail(schema, null, `Expected { readonly a: number | undefined }, actual null`)
      Util.assertions.asserts.fail(
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
