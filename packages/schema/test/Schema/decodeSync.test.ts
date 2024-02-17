import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, expect, it } from "vitest"

describe("Schema > decodeSync", () => {
  const schema = S.struct({ a: Util.NumberFromChar })

  it("should throw on invalid values", () => {
    expect(S.decodeSync(schema)({ a: "1" })).toEqual({ a: 1 })
    expect(() => S.decodeSync(schema)({ a: "10" })).toThrow(
      new Error(`{ a: NumberFromChar }
└─ ["a"]
   └─ NumberFromChar
      └─ From side transformation failure
         └─ Char
            └─ Predicate refinement failure
               └─ Expected Char (a single character), actual "10"`)
    )
  })

  it("should throw on async", () => {
    expect(() => S.decodeSync(Util.AsyncString)("a")).toThrow(
      new Error(
        `AsyncString
└─ Fiber #1 cannot be be resolved synchronously, this is caused by using runSync on an effect that performs async work`
      )
    )
  })

  it("should respect outer/inner options", () => {
    const input = { a: "1", b: "b" }
    expect(() => S.decodeSync(schema)(input, { onExcessProperty: "error" })).toThrow(
      new Error(`{ a: NumberFromChar }
└─ ["b"]
   └─ is unexpected, expected "a"`)
    )
    expect(() => S.decodeSync(schema, { onExcessProperty: "error" })(input)).toThrow(
      new Error(`{ a: NumberFromChar }
└─ ["b"]
   └─ is unexpected, expected "a"`)
    )
    expect(S.decodeSync(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }))
      .toEqual({ a: 1 })
  })
})
