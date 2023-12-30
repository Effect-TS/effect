import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { identity } from "effect/Function"
import { describe, expect, it } from "vitest"

const NumberFromString = S.NumberFromString

describe("Schema > required", () => {
  it("string", () => {
    expect(S.required(S.string).ast).toEqual(S.string.ast)
  })

  it("struct", async () => {
    const schema = S.required(S.struct({
      a: S.optional(NumberFromString.pipe(S.greaterThan(0)), { exact: true })
    }))

    await Util.expectParseSuccess(schema, { a: "1" }, { a: 1 })
    await Util.expectParseFailure(
      schema,
      {},
      `{ a: a positive number }
└─ ["a"]
   └─ is missing`
    )
    await Util.expectParseFailure(
      schema,
      { a: "-1" },
      `{ a: a positive number }
└─ ["a"]
   └─ a positive number
      └─ Predicate refinement failure
         └─ Expected a positive number, actual -1`
    )
  })

  it("tuple/ e?", async () => {
    // type A = [string?]
    // type B = Required<A>
    const schema = S.required(S.tuple().pipe(S.optionalElement(NumberFromString)))

    await Util.expectParseSuccess(schema, ["1"], [1])
    await Util.expectParseFailure(
      schema,
      [],
      `readonly [NumberFromString]
└─ [0]
   └─ is missing`
    )
  })

  it("tuple/ e e?", async () => {
    const schema = S.required(S.tuple(NumberFromString).pipe(S.optionalElement(S.string)))

    await Util.expectParseSuccess(schema, ["0", ""], [0, ""])
    await Util.expectParseFailure(
      schema,
      ["0"],
      `readonly [NumberFromString, string]
└─ [1]
   └─ is missing`
    )
  })

  it("tuple/ e r e", async () => {
    // type A = readonly [string, ...Array<number>, boolean]
    // type B = Required<A> // [string, ...(number | boolean)[], number | boolean]

    const schema = S.required(S.tuple(S.string).pipe(S.rest(S.number), S.element(S.boolean)))

    await Util.expectParseSuccess(schema, ["", 0], ["", 0])
    await Util.expectParseSuccess(schema, ["", true], ["", true])
    await Util.expectParseSuccess(schema, ["", true, 0], ["", true, 0])
    await Util.expectParseSuccess(schema, ["", 0, true], ["", 0, true])

    await Util.expectParseFailure(
      schema,
      [],
      `readonly [string, ...(number | boolean)[], number | boolean]
└─ [0]
   └─ is missing`
    )
    await Util.expectParseFailure(
      schema,
      [""],
      `readonly [string, ...(number | boolean)[], number | boolean]
└─ [1]
   └─ is missing`
    )
  })

  it("tuple/ e r 2e", async () => {
    // type A = readonly [string, ...Array<number>, boolean, boolean]
    // type B = Required<A> // [string, ...(number | boolean)[], number | boolean, number | boolean]

    const schema = S.required(
      S.tuple(S.string).pipe(S.rest(S.number), S.element(S.boolean), S.element(S.boolean))
    )

    await Util.expectParseSuccess(schema, ["", 0, true])
    await Util.expectParseSuccess(schema, ["", 0, true, false])
    await Util.expectParseSuccess(schema, ["", 0, 1, 2, 3, true, false])

    await Util.expectParseFailure(
      schema,
      [],
      `readonly [string, ...(number | boolean)[], number | boolean, number | boolean]
└─ [0]
   └─ is missing`
    )
    await Util.expectParseFailure(
      schema,
      [""],
      `readonly [string, ...(number | boolean)[], number | boolean, number | boolean]
└─ [1]
   └─ is missing`
    )
    await Util.expectParseFailure(
      schema,
      ["", true],
      `readonly [string, ...(number | boolean)[], number | boolean, number | boolean]
└─ [2]
   └─ is missing`
    )
    await Util.expectParseFailure(
      schema,
      ["", 0, "a"],
      `readonly [string, ...(number | boolean)[], number | boolean, number | boolean]
└─ [2]
   └─ number | boolean
      ├─ Union member
      │  └─ Expected a number, actual "a"
      └─ Union member
         └─ Expected a boolean, actual "a"`
    )
  })

  it("union", async () => {
    const schema = S.required(S.union(
      S.struct({ a: S.optional(S.string, { exact: true }) }),
      S.struct({ b: S.optional(S.number, { exact: true }) })
    ))
    await Util.expectParseSuccess(schema, { a: "a" })
    await Util.expectParseSuccess(schema, { b: 1 })
    await Util.expectParseFailure(
      schema,
      {},
      `{ a: string } | { b: number }
├─ Union member
│  └─ { a: string }
│     └─ ["a"]
│        └─ is missing
└─ Union member
   └─ { b: number }
      └─ ["b"]
         └─ is missing`
    )
  })

  it("suspend", async () => {
    interface A {
      readonly a: null | A
    }
    const schema: S.Schema<A> = S.required(S.suspend( // intended outer suspend
      () =>
        S.struct({
          a: S.optional(S.union(S.null, schema), { exact: true })
        })
    ))
    await Util.expectParseSuccess(schema, { a: null })
    await Util.expectParseSuccess(schema, { a: { a: null } })
    await Util.expectParseFailure(
      schema,
      {},
      `{ a: <suspended schema> | null }
└─ ["a"]
   └─ is missing`
    )
    await Util.expectParseFailure(
      schema,
      { a: {} },
      `{ a: <suspended schema> | null }
└─ ["a"]
   └─ <suspended schema> | null
      ├─ Union member
      │  └─ { a: <suspended schema> | null }
      │     └─ ["a"]
      │        └─ is missing
      └─ Union member
         └─ Expected null, actual {}`
    )
  })

  it("declarations should throw", async () => {
    expect(() => S.required(S.optionFromSelf(S.string))).toThrow(
      new Error("`required` cannot handle declarations")
    )
  })

  it("refinements should throw", async () => {
    expect(() => S.required(S.string.pipe(S.minLength(2)))).toThrow(
      new Error("`required` cannot handle refinements")
    )
  })

  it("transformations should throw", async () => {
    expect(() => S.required(S.transform(S.string, S.string, identity, identity))).toThrow(
      new Error("`required` cannot handle transformations")
    )
  })
})
