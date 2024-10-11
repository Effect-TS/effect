import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("encodeSync", () => {
  const schema = S.Struct({ a: Util.NumberFromChar })

  it("should throw on invalid values", () => {
    expect(S.encodeSync(schema)({ a: 1 })).toEqual({ a: "1" })
    expect(() => S.encodeSync(schema)({ a: 10 })).toThrow(
      new Error(`{ readonly a: NumberFromChar }
└─ ["a"]
   └─ NumberFromChar
      └─ Encoded side transformation failure
         └─ Char
            └─ Predicate refinement failure
               └─ Expected Char, actual "10"`)
    )
  })

  it("should throw on async", () => {
    expect(() => S.encodeSync(Util.AsyncString)("a")).toThrow(
      new Error(
        `AsyncString
└─ cannot be be resolved synchronously, this is caused by using runSync on an effect that performs async work`
      )
    )
  })

  it("should respect outer/inner options", () => {
    const input = { a: 1, b: "b" }
    expect(() => S.encodeSync(schema)(input, { onExcessProperty: "error" })).toThrow(
      new Error(`{ readonly a: NumberFromChar }
└─ ["b"]
   └─ is unexpected, expected: "a"`)
    )
    expect(() => S.encodeSync(schema, { onExcessProperty: "error" })(input)).toThrow(
      new Error(`{ readonly a: NumberFromChar }
└─ ["b"]
   └─ is unexpected, expected: "a"`)
    )
    expect(S.encodeSync(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }))
      .toEqual({ a: "1" })
  })
})
