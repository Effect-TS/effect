import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, expect, it } from "vitest"

describe("Schema > encodeSync", () => {
  const schema = S.struct({ a: Util.NumberFromChar })

  it("should throw on invalid values", () => {
    expect(S.encodeSync(schema)({ a: 1 })).toEqual({ a: "1" })
    expect(() => S.encodeSync(schema)({ a: 10 })).toThrow(
      new Error(`{ a: NumberFromChar }
└─ ["a"]
   └─ NumberFromChar
      └─ From side transformation failure
         └─ Char
            └─ Predicate refinement failure
               └─ Expected Char (a single character), actual "10"`)
    )
  })

  it("should respect outer/inner options", () => {
    const input = { a: 1, b: "b" }
    expect(() => S.encodeSync(schema)(input, { onExcessProperty: "error" })).toThrow(
      new Error(`{ a: NumberFromChar }
└─ ["b"]
   └─ is unexpected, expected "a"`)
    )
    expect(() => S.encodeSync(schema, { onExcessProperty: "error" })(input)).toThrow(
      new Error(`{ a: NumberFromChar }
└─ ["b"]
   └─ is unexpected, expected "a"`)
    )
    expect(S.encodeSync(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }))
      .toEqual({ a: "1" })
  })
})
