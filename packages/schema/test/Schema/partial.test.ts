import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { identity } from "effect/Function"
import { describe, expect, it } from "vitest"

describe("partial", () => {
  describe("{ exact: false }", () => {
    it("Struct", async () => {
      const schema = S.partial(S.Struct({ a: S.Number }))
      await Util.expectDecodeUnknownSuccess(schema, {})
      await Util.expectDecodeUnknownSuccess(schema, { a: 1 })
      await Util.expectDecodeUnknownSuccess(schema, { a: undefined })

      await Util.expectDecodeUnknownFailure(
        schema,
        { a: null },
        `{ a?: number | undefined }
└─ ["a"]
   └─ number | undefined
      ├─ Union member
      │  └─ Expected a number, actual null
      └─ Union member
         └─ Expected undefined, actual null`
      )
    })

    it("Record", async () => {
      const schema = S.partial(S.Record(S.String, S.NumberFromString))
      await Util.expectDecodeUnknownSuccess(schema, {}, {})
      await Util.expectDecodeUnknownSuccess(schema, { a: "1" }, { a: 1 })
      await Util.expectDecodeUnknownSuccess(schema, { a: undefined })
    })

    describe("Tuple", () => {
      it("e", async () => {
        const schema = S.partial(S.Tuple(S.NumberFromString))
        await Util.expectDecodeUnknownSuccess(schema, ["1"], [1])
        await Util.expectDecodeUnknownSuccess(schema, [], [])
        await Util.expectDecodeUnknownSuccess(schema, [undefined])
      })

      it("e r", async () => {
        const schema = S.partial(S.Tuple([S.NumberFromString], S.NumberFromString))
        await Util.expectDecodeUnknownSuccess(schema, ["1"], [1])
        await Util.expectDecodeUnknownSuccess(schema, [], [])
        await Util.expectDecodeUnknownSuccess(schema, ["1", "2"], [1, 2])
        await Util.expectDecodeUnknownSuccess(schema, ["1", undefined], [1, undefined])
        await Util.expectDecodeUnknownSuccess(schema, [undefined])
      })
    })

    it("Array", async () => {
      const schema = S.partial(S.Array(S.Number))
      await Util.expectDecodeUnknownSuccess(schema, [])
      await Util.expectDecodeUnknownSuccess(schema, [1])
      await Util.expectDecodeUnknownSuccess(schema, [undefined])

      await Util.expectDecodeUnknownFailure(
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
  })

  describe("{ exact: true }", () => {
    it("Struct", async () => {
      const schema = S.partial(S.Struct({ a: S.Number }), { exact: true })
      await Util.expectDecodeUnknownSuccess(schema, {})
      await Util.expectDecodeUnknownSuccess(schema, { a: 1 })

      await Util.expectDecodeUnknownFailure(
        schema,
        { a: undefined },
        `{ a?: number }
└─ ["a"]
   └─ Expected a number, actual undefined`
      )
    })

    it("Record", async () => {
      const schema = S.partial(S.Record(S.String, S.NumberFromString), { exact: true })
      await Util.expectDecodeUnknownSuccess(schema, {}, {})
      await Util.expectDecodeUnknownSuccess(schema, { a: "1" }, { a: 1 })
      await Util.expectDecodeUnknownSuccess(schema, { a: undefined })
    })

    describe("Tuple", () => {
      it("e", async () => {
        const schema = S.partial(S.Tuple(S.NumberFromString), { exact: true })
        await Util.expectDecodeUnknownSuccess(schema, ["1"], [1])
        await Util.expectDecodeUnknownSuccess(schema, [], [])

        await Util.expectDecodeUnknownFailure(
          schema,
          [undefined],
          `readonly [NumberFromString?]
└─ [0]
   └─ NumberFromString
      └─ Encoded side transformation failure
         └─ Expected a string, actual undefined`
        )
      })

      it("e + r", async () => {
        const schema = S.partial(S.Tuple([S.NumberFromString], S.NumberFromString), { exact: true })
        await Util.expectDecodeUnknownSuccess(schema, ["1"], [1])
        await Util.expectDecodeUnknownSuccess(schema, [], [])
        await Util.expectDecodeUnknownSuccess(schema, ["1", "2"], [1, 2])
        await Util.expectDecodeUnknownSuccess(schema, ["1", undefined], [1, undefined])

        await Util.expectDecodeUnknownFailure(
          schema,
          [undefined],
          `readonly [NumberFromString?, ...(NumberFromString | undefined)[]]
└─ [0]
   └─ NumberFromString
      └─ Encoded side transformation failure
         └─ Expected a string, actual undefined`
        )
      })
    })

    it("Array", async () => {
      const schema = S.partial(S.Array(S.Number), { exact: true })
      await Util.expectDecodeUnknownSuccess(schema, [])
      await Util.expectDecodeUnknownSuccess(schema, [1])
      await Util.expectDecodeUnknownSuccess(schema, [undefined])

      await Util.expectDecodeUnknownFailure(
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

    it("Union", async () => {
      const schema = S.partial(S.Union(S.Array(S.Number), S.String), { exact: true })
      await Util.expectDecodeUnknownSuccess(schema, "a")
      await Util.expectDecodeUnknownSuccess(schema, [])
      await Util.expectDecodeUnknownSuccess(schema, [1])
      await Util.expectDecodeUnknownSuccess(schema, [undefined])

      await Util.expectDecodeUnknownFailure(
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

    it("suspend", async () => {
      interface A {
        readonly a?: null | A
      }
      const schema: S.Schema<A> = S.partial(
        S.suspend( // intended outer suspend
          () =>
            S.Struct({
              a: S.Union(schema, S.Null)
            })
        ),
        { exact: true }
      )
      await Util.expectDecodeUnknownSuccess(schema, {})
      await Util.expectDecodeUnknownSuccess(schema, { a: null })
      await Util.expectDecodeUnknownSuccess(schema, { a: {} })
      await Util.expectDecodeUnknownSuccess(schema, { a: { a: null } })
      await Util.expectDecodeUnknownFailure(
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
  })

  describe("unsupported schemas", () => {
    it("declarations should throw", () => {
      expect(() => S.partial(S.OptionFromSelf(S.String))).toThrow(
        new Error("partial: cannot handle declarations")
      )
      expect(() => S.partial(S.OptionFromSelf(S.String), { exact: true })).toThrow(
        new Error("partial: cannot handle declarations")
      )
    })

    it("refinements should throw", () => {
      expect(() => S.partial(S.String.pipe(S.minLength(2)))).toThrow(
        new Error("partial: cannot handle refinements")
      )
      expect(() => S.partial(S.String.pipe(S.minLength(2)), { exact: true })).toThrow(
        new Error("partial: cannot handle refinements")
      )
    })

    describe("Transformation", () => {
      describe("should support property key renamings", () => {
        it("{ exact: false }", async () => {
          const original = S.Struct({
            a: S.String,
            b: S.propertySignature(S.String).pipe(S.fromKey("c"))
          })
          const schema = S.partial(original)
          expect(S.format(schema)).toBe(
            "({ a?: string | undefined; c?: string | undefined } <-> { a?: string | undefined; b?: string | undefined })"
          )
          await Util.expectDecodeUnknownSuccess(schema, {})
          await Util.expectDecodeUnknownSuccess(schema, { a: undefined })
          await Util.expectDecodeUnknownSuccess(schema, { c: undefined }, { b: undefined })
          await Util.expectDecodeUnknownSuccess(schema, { a: "a" })
          await Util.expectDecodeUnknownSuccess(schema, { c: "b" }, { b: "b" })
          await Util.expectDecodeUnknownSuccess(schema, { a: undefined, c: undefined }, { a: undefined, b: undefined })
          await Util.expectDecodeUnknownSuccess(schema, { a: "a", c: undefined }, { a: "a", b: undefined })
          await Util.expectDecodeUnknownSuccess(schema, { a: undefined, c: "b" }, { a: undefined, b: "b" })
          await Util.expectDecodeUnknownSuccess(schema, { a: "a", c: "b" }, { a: "a", b: "b" })
        })

        it("{ exact: true }", async () => {
          const original = S.Struct({
            a: S.String,
            b: S.propertySignature(S.String).pipe(S.fromKey("c"))
          })
          const schema = S.partial(original, { exact: true })
          expect(S.format(schema)).toBe("({ a?: string; c?: string } <-> { a?: string; b?: string })")
          await Util.expectDecodeUnknownSuccess(schema, {})
          await Util.expectDecodeUnknownSuccess(schema, { a: "a" })
          await Util.expectDecodeUnknownSuccess(schema, { c: "b" }, { b: "b" })
          await Util.expectDecodeUnknownSuccess(schema, { a: "a", c: "b" }, { a: "a", b: "b" })
        })
      })

      it("transformations should throw", () => {
        expect(() => S.partial(S.transform(S.String, S.String, { decode: identity, encode: identity }))).toThrow(
          new Error("partial: cannot handle transformations")
        )
        expect(() =>
          S.partial(S.transform(S.String, S.String, { decode: identity, encode: identity }), { exact: true })
        ).toThrow(new Error("partial: cannot handle transformations"))
      })
    })
  })
})
