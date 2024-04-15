import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, expect, it } from "vitest"

const expectAssertsSuccess = <A, I>(schema: S.Schema<A, I>, input: unknown) => {
  expect(S.asserts(schema)(input)).toEqual(undefined)
}

const expectAssertsFailure = <A, I>(schema: S.Schema<A, I>, input: unknown, message: string) => {
  expect(() => S.asserts(schema)(input)).toThrow(new Error(message))
}

describe("Schema > asserts", () => {
  it("should respect outer/inner options", () => {
    const schema = S.Struct({ a: Util.NumberFromChar })
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

  describe("struct", () => {
    it("required property signature", () => {
      const schema = S.Struct({ a: Util.NumberFromChar })
      expectAssertsSuccess(schema, { a: 1 })
      expectAssertsFailure(
        schema,
        { a: null },
        `{ a: number }
└─ ["a"]
   └─ Expected a number, actual null`
      )
    })

    it("required property signature with undefined", () => {
      const schema = S.Struct({ a: S.Union(S.Number, S.Undefined) })
      expectAssertsSuccess(schema, { a: 1 })
      expectAssertsSuccess(schema, { a: undefined })
      expectAssertsSuccess(schema, { a: 1, b: "b" })

      expectAssertsFailure(
        schema,
        {},
        `{ a: number | undefined }
└─ ["a"]
   └─ is missing`
      )
      expectAssertsFailure(schema, null, `Expected { a: number | undefined }, actual null`)
      expectAssertsFailure(
        schema,
        { a: "a" },
        `{ a: number | undefined }
└─ ["a"]
   └─ number | undefined
      ├─ Union member
      │  └─ Expected a number, actual "a"
      └─ Union member
         └─ Expected undefined, actual "a"`
      )
    })
  })
})
