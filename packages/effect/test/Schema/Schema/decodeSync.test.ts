import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import * as S from "effect/Schema"
import * as Util from "../TestUtils.js"

describe("decodeSync", () => {
  const schema = S.Struct({ a: Util.NumberFromChar })

  it("should throw on invalid values", () => {
    deepStrictEqual(S.decodeSync(schema)({ a: "1" }), { a: 1 })
    Util.assertions.parseError(
      () => S.decodeSync(schema)({ a: "10" }),
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
    Util.assertions.parseError(
      () => S.decodeSync(Util.AsyncString)("a"),
      `AsyncString
└─ cannot be be resolved synchronously, this is caused by using runSync on an effect that performs async work`
    )
  })

  it("should respect outer/inner options", () => {
    const input = { a: "1", b: "b" }
    Util.assertions.parseError(
      () => S.decodeSync(schema)(input, { onExcessProperty: "error" }),
      `{ readonly a: NumberFromChar }
└─ ["b"]
   └─ is unexpected, expected: "a"`
    )
    Util.assertions.parseError(
      () => S.decodeSync(schema, { onExcessProperty: "error" })(input),
      `{ readonly a: NumberFromChar }
└─ ["b"]
   └─ is unexpected, expected: "a"`
    )
    deepStrictEqual(S.decodeSync(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }), {
      a: 1
    })
  })
})
