import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, expect, it } from "vitest"

describe("Schema > asserts", () => {
  const schema = S.struct({ a: Util.NumberFromChar })

  it("should throw on invalid values", () => {
    expect(S.asserts(schema)({ a: 1 })).toEqual(undefined)
    expect(() => S.asserts(schema)({ a: null })).toThrow(
      new Error(`{ a: number }
└─ ["a"]
   └─ Expected a number, actual null`)
    )
  })

  it("should respect outer/inner options", () => {
    const input = { a: 1, b: "b" }
    expect(() => S.asserts(schema)(input, { onExcessProperty: "error" })).toThrow(
      new Error(`{ a: number }
└─ ["b"]
   └─ is unexpected, expected "a"`)
    )
    expect(() => S.asserts(schema, { onExcessProperty: "error" })(input)).toThrow(
      new Error(`{ a: number }
└─ ["b"]
   └─ is unexpected, expected "a"`)
    )
    expect(S.asserts(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }))
      .toEqual(undefined)
  })
})
