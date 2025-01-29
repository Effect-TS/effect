import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { deepStrictEqual } from "effect/test/util"
import { describe, it } from "vitest"

describe("encodeSync", () => {
  const schema = S.Struct({ a: Util.NumberFromChar })

  it("should throw on invalid values", () => {
    deepStrictEqual(S.encodeSync(schema)({ a: 1 }), { a: "1" })
    Util.expectParseError(
      () => S.encodeSync(schema)({ a: 10 }),
      `{ readonly a: NumberFromChar }
└─ ["a"]
   └─ NumberFromChar
      └─ Encoded side transformation failure
         └─ Char
            └─ Predicate refinement failure
               └─ Expected a single character, actual "10"`
    )
  })

  it("should throw on async", () => {
    Util.expectParseError(
      () => S.encodeSync(Util.AsyncString)("a"),
      `AsyncString
└─ cannot be be resolved synchronously, this is caused by using runSync on an effect that performs async work`
    )
  })

  it("should respect outer/inner options", () => {
    const input = { a: 1, b: "b" }
    Util.expectParseError(
      () => S.encodeSync(schema)(input, { onExcessProperty: "error" }),
      `{ readonly a: NumberFromChar }
└─ ["b"]
   └─ is unexpected, expected: "a"`
    )
    Util.expectParseError(
      () => S.encodeSync(schema, { onExcessProperty: "error" })(input),
      `{ readonly a: NumberFromChar }
└─ ["b"]
   └─ is unexpected, expected: "a"`
    )
    deepStrictEqual(S.encodeSync(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }), {
      a: "1"
    })
  })
})
