import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { identity } from "effect/Function"
import { describe, expect, it } from "vitest"

const NumberFromString = S.NumberFromString

describe("Schema > partial", () => {
  it("struct", async () => {
    const schema = S.partial(S.struct({ a: S.number }))
    await Util.expectParseSuccess(schema, {})
    await Util.expectParseSuccess(schema, { a: 1 })

    await Util.expectParseFailure(
      schema,
      { a: undefined },
      `{ a?: number }
└─ ["a"]
   └─ Expected a number, actual undefined`
    )
  })

  it("tuple", async () => {
    const schema = S.partial(S.tuple(S.string, S.number))
    await Util.expectParseSuccess(schema, [])
    await Util.expectParseSuccess(schema, ["a"])
    await Util.expectParseSuccess(schema, ["a", 1])
  })

  it("array", async () => {
    const schema = S.partial(S.array(S.number))
    await Util.expectParseSuccess(schema, [])
    await Util.expectParseSuccess(schema, [1])
    await Util.expectParseSuccess(schema, [undefined])

    await Util.expectParseFailure(
      schema,
      ["a"],
      `ReadonlyArray<number | undefined>
└─ [0]
   └─ number | undefined
      ├─ Union member
      │  └─ Expected a number, actual "a"
      └─ Union member
         └─ Expected undefined, actual "a"`
    )
  })

  it("union", async () => {
    const schema = S.partial(S.union(S.string, S.array(S.number)))
    await Util.expectParseSuccess(schema, "a")
    await Util.expectParseSuccess(schema, [])
    await Util.expectParseSuccess(schema, [1])
    await Util.expectParseSuccess(schema, [undefined])

    await Util.expectParseFailure(
      schema,
      ["a"],
      `ReadonlyArray<number | undefined> | string
├─ Union member
│  └─ ReadonlyArray<number | undefined>
│     └─ [0]
│        └─ number | undefined
│           ├─ Union member
│           │  └─ Expected a number, actual "a"
│           └─ Union member
│              └─ Expected undefined, actual "a"
└─ Union member
   └─ Expected a string, actual ["a"]`
    )
  })

  it("tuple/ e", async () => {
    const schema = S.partial(S.tuple(NumberFromString))
    await Util.expectParseSuccess(schema, ["1"], [1])
    await Util.expectParseSuccess(schema, [], [])
  })

  it("tuple/ e r", async () => {
    const schema = S.partial(S.tuple(NumberFromString).pipe(S.rest(NumberFromString)))
    await Util.expectParseSuccess(schema, ["1"], [1])
    await Util.expectParseSuccess(schema, [], [])
    await Util.expectParseSuccess(schema, ["1", "2"], [1, 2])
    await Util.expectParseSuccess(schema, ["1", undefined], [1, undefined])
  })

  it("record", async () => {
    const schema = S.partial(S.record(S.string, NumberFromString))
    await Util.expectParseSuccess(schema, {}, {})
    await Util.expectParseSuccess(schema, { a: "1" }, { a: 1 })
  })

  it("suspend", async () => {
    interface A {
      readonly a?: null | A
    }
    const schema: S.Schema<A> = S.partial(S.suspend( // intended outer suspend
      () =>
        S.struct({
          a: S.union(S.null, schema)
        })
    ))
    await Util.expectParseSuccess(schema, {})
    await Util.expectParseSuccess(schema, { a: null })
    await Util.expectParseSuccess(schema, { a: {} })
    await Util.expectParseSuccess(schema, { a: { a: null } })
    await Util.expectParseFailure(
      schema,
      { a: 1 },
      `{ a?: <suspended schema> | null }
└─ ["a"]
   └─ <suspended schema> | null
      ├─ Union member
      │  └─ Expected { a?: <suspended schema> | null }, actual 1
      └─ Union member
         └─ Expected null, actual 1`
    )
  })

  it("declarations should throw", async () => {
    expect(() => S.partial(S.optionFromSelf(S.string))).toThrow(
      new Error("`partial` cannot handle declarations")
    )
  })

  it("refinements should throw", async () => {
    expect(() => S.partial(S.string.pipe(S.minLength(2)))).toThrow(
      new Error("`partial` cannot handle refinements")
    )
  })

  it("transformations should throw", async () => {
    expect(() => S.partial(S.transform(S.string, S.string, identity, identity))).toThrow(
      new Error("`partial` cannot handle transformations")
    )
  })
})
