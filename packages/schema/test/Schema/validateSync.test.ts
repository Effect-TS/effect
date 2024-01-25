import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, expect, it } from "vitest"

describe("Schema > validateSync", () => {
  const schema = S.struct({ a: Util.NumberFromChar })

  it("should throw on invalid values", () => {
    expect(S.validateSync(schema)({ a: 1 })).toEqual({ a: 1 })
    expect(() => S.validateSync(schema)({ a: null })).toThrow(
      new Error(`{ a: number }
└─ ["a"]
   └─ Expected a number, actual null`)
    )
  })

  it("should throw on async", () => {
    expect(() => S.validateSync(Util.AsyncDeclaration)("a")).toThrow(
      new Error(
        `AsyncDeclaration
└─ Fiber #0 cannot be be resolved synchronously, this is caused by using runSync on an effect that performs async work`
      )
    )
  })

  it("should respect outer/inner options", () => {
    const input = { a: 1, b: "b" }
    expect(() => S.validateSync(schema)(input, { onExcessProperty: "error" })).toThrow(
      new Error(`{ a: number }
└─ ["b"]
   └─ is unexpected, expected "a"`)
    )
    expect(() => S.validateSync(schema, { onExcessProperty: "error" })(input)).toThrow(
      new Error(`{ a: number }
└─ ["b"]
   └─ is unexpected, expected "a"`)
    )
    expect(S.validateSync(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }))
      .toEqual({ a: 1 })
  })
})
