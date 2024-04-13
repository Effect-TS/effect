import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { identity } from "effect/Function"
import { describe, expect, it } from "vitest"

describe("Schema > required", () => {
  it("string", () => {
    expect(S.required(S.String).ast).toEqual(S.String.ast)
  })

  it("struct", async () => {
    const schema = S.required(S.Struct({
      a: S.optional(S.NumberFromString.pipe(S.greaterThan(0)), { exact: true })
    }))

    await Util.expectDecodeUnknownSuccess(schema, { a: "1" }, { a: 1 })
    await Util.expectDecodeUnknownFailure(
      schema,
      {},
      `{ a: a positive number }
└─ ["a"]
   └─ is missing`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      { a: "-1" },
      `{ a: a positive number }
└─ ["a"]
   └─ a positive number
      └─ Predicate refinement failure
         └─ Expected a positive number, actual -1`
    )
  })

  describe("tuple", () => {
    it("e?", async () => {
      // type A = readonly [string?]
      // type B = Required<A>

      const A = S.Tuple(S.optionalElement(S.NumberFromString))
      const B = S.required(A)

      await Util.expectDecodeUnknownSuccess(B, ["1"], [1])
      await Util.expectDecodeUnknownFailure(
        B,
        [],
        `readonly [NumberFromString]
└─ [0]
   └─ is missing`
      )
    })

    it("e e?", async () => {
      // type A = readonly [number, string?]
      // type B = Required<A>

      const A = S.Tuple(S.NumberFromString, S.optionalElement(S.String))
      const B = S.required(A)

      await Util.expectDecodeUnknownSuccess(B, ["0", ""], [0, ""])
      await Util.expectDecodeUnknownFailure(
        B,
        ["0"],
        `readonly [NumberFromString, string]
└─ [1]
   └─ is missing`
      )
    })

    it("e r e", async () => {
      // type A = readonly [string, ...Array<number>, boolean]
      // type B = Required<A> // readonly [string, ...number[], boolean]

      const A = S.Tuple([S.String], S.Number, S.Boolean)
      const B = S.required(A)

      await Util.expectDecodeUnknownSuccess(B, ["", true], ["", true])
      await Util.expectDecodeUnknownSuccess(B, ["", 0, true])
      await Util.expectDecodeUnknownSuccess(B, ["", 0, 1, true])

      await Util.expectDecodeUnknownFailure(
        B,
        [],
        `readonly [string, ...number[], boolean]
└─ [0]
   └─ is missing`
      )
      await Util.expectDecodeUnknownFailure(
        B,
        [""],
        `readonly [string, ...number[], boolean]
└─ [1]
   └─ is missing`
      )
    })

    it("e r e e", async () => {
      // type A = readonly [string, ...Array<number>, boolean, boolean]
      // type B = Required<A> // readonly [string, ...number[], boolean, boolean]

      const A = S.Tuple([S.String], S.Number, S.Boolean, S.Boolean)
      const B = S.required(A)

      await Util.expectDecodeUnknownSuccess(B, ["", 0, true, false])
      await Util.expectDecodeUnknownSuccess(B, ["", 0, 1, 2, 3, true, false])

      await Util.expectDecodeUnknownFailure(
        B,
        [],
        `readonly [string, ...number[], boolean, boolean]
└─ [0]
   └─ is missing`
      )
      await Util.expectDecodeUnknownFailure(
        B,
        [""],
        `readonly [string, ...number[], boolean, boolean]
└─ [1]
   └─ is missing`
      )
      await Util.expectDecodeUnknownFailure(
        B,
        ["", true],
        `readonly [string, ...number[], boolean, boolean]
└─ [2]
   └─ is missing`
      )
      await Util.expectDecodeUnknownFailure(
        B,
        ["", 0, true],
        `readonly [string, ...number[], boolean, boolean]
└─ [1]
   └─ Expected a boolean, actual 0`
      )
    })
  })

  it("union", async () => {
    const schema = S.required(S.Union(
      S.Struct({ a: S.optional(S.String, { exact: true }) }),
      S.Struct({ b: S.optional(S.Number, { exact: true }) })
    ))
    await Util.expectDecodeUnknownSuccess(schema, { a: "a" })
    await Util.expectDecodeUnknownSuccess(schema, { b: 1 })
    await Util.expectDecodeUnknownFailure(
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
        S.Struct({
          a: S.optional(S.Union(schema, S.Null), { exact: true })
        })
    ))
    await Util.expectDecodeUnknownSuccess(schema, { a: null })
    await Util.expectDecodeUnknownSuccess(schema, { a: { a: null } })
    await Util.expectDecodeUnknownFailure(
      schema,
      {},
      `{ a: <suspended schema> | null }
└─ ["a"]
   └─ is missing`
    )
    await Util.expectDecodeUnknownFailure(
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
    expect(() => S.required(S.OptionFromSelf(S.String))).toThrow(
      new Error("Required: cannot handle declarations")
    )
  })

  it("refinements should throw", async () => {
    expect(() => S.required(S.String.pipe(S.minLength(2)))).toThrow(
      new Error("Required: cannot handle refinements")
    )
  })

  it("transformations should throw", async () => {
    expect(() => S.required(S.transform(S.String, S.String, { decode: identity, encode: identity }))).toThrow(
      new Error("Required: cannot handle transformations")
    )
  })
})
