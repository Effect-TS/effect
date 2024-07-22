import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { identity } from "effect/Function"
import { describe, expect, it } from "vitest"

describe("partialWith", () => {
  describe("{ exact: true }", () => {
    it("Struct", async () => {
      const schema = S.partialWith(S.Struct({ a: S.Number }), { exact: true })
      await Util.expectDecodeUnknownSuccess(schema, {})
      await Util.expectDecodeUnknownSuccess(schema, { a: 1 })

      await Util.expectDecodeUnknownFailure(
        schema,
        { a: undefined },
        `{ readonly a?: number }
└─ ["a"]
   └─ Expected number, actual undefined`
      )
    })

    it("Record", async () => {
      const schema = S.partialWith(S.Record({ key: S.String, value: S.NumberFromString }), { exact: true })
      await Util.expectDecodeUnknownSuccess(schema, {}, {})
      await Util.expectDecodeUnknownSuccess(schema, { a: "1" }, { a: 1 })
      await Util.expectDecodeUnknownSuccess(schema, { a: undefined })
    })

    describe("Tuple", () => {
      it("e", async () => {
        const schema = S.partialWith(S.Tuple(S.NumberFromString), { exact: true })
        await Util.expectDecodeUnknownSuccess(schema, ["1"], [1])
        await Util.expectDecodeUnknownSuccess(schema, [], [])

        await Util.expectDecodeUnknownFailure(
          schema,
          [undefined],
          `readonly [NumberFromString?]
└─ [0]
   └─ NumberFromString
      └─ Encoded side transformation failure
         └─ Expected string, actual undefined`
        )
      })

      it("e + r", async () => {
        const schema = S.partialWith(S.Tuple([S.NumberFromString], S.NumberFromString), { exact: true })
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
         └─ Expected string, actual undefined`
        )
      })
    })

    it("Array", async () => {
      const schema = S.partialWith(S.Array(S.Number), { exact: true })
      await Util.expectDecodeUnknownSuccess(schema, [])
      await Util.expectDecodeUnknownSuccess(schema, [1])
      await Util.expectDecodeUnknownSuccess(schema, [undefined])

      await Util.expectDecodeUnknownFailure(
        schema,
        ["a"],
        `ReadonlyArray<number | undefined>
└─ [0]
   └─ number | undefined
      ├─ Expected number, actual "a"
      └─ Expected undefined, actual "a"`
      )
    })

    it("Union", async () => {
      const schema = S.partialWith(S.Union(S.Array(S.Number), S.String), { exact: true })
      await Util.expectDecodeUnknownSuccess(schema, "a")
      await Util.expectDecodeUnknownSuccess(schema, [])
      await Util.expectDecodeUnknownSuccess(schema, [1])
      await Util.expectDecodeUnknownSuccess(schema, [undefined])

      await Util.expectDecodeUnknownFailure(
        schema,
        ["a"],
        `ReadonlyArray<number | undefined> | string
├─ ReadonlyArray<number | undefined>
│  └─ [0]
│     └─ number | undefined
│        ├─ Expected number, actual "a"
│        └─ Expected undefined, actual "a"
└─ Expected string, actual ["a"]`
      )
    })

    it("suspend", async () => {
      interface A {
        readonly a?: null | A
      }
      const schema: S.Schema<A> = S.partialWith(
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
        `{ readonly a?: <suspended schema> | null }
└─ ["a"]
   └─ <suspended schema> | null
      ├─ Expected { readonly a?: <suspended schema> | null }, actual 1
      └─ Expected null, actual 1`
      )
    })
  })

  describe("unsupported schemas", () => {
    it("declarations should throw", () => {
      expect(() => S.partialWith(S.OptionFromSelf(S.String), { exact: true })).toThrow(
        new Error(`Unsupported schema
schema (Declaration): Option<string>`)
      )
    })

    it("refinements should throw", () => {
      expect(() => S.partialWith(S.String.pipe(S.minLength(2)), { exact: true })).toThrow(
        new Error(`Unsupported schema
schema (Refinement): a string at least 2 character(s) long`)
      )
    })

    describe("Transformation", () => {
      it("should support property key renamings", async () => {
        const original = S.Struct({
          a: S.String,
          b: S.propertySignature(S.String).pipe(S.fromKey("c"))
        })
        const schema = S.partialWith(original, { exact: true })
        expect(S.format(schema)).toBe(
          "({ readonly a?: string; readonly c?: string } <-> { readonly a?: string; readonly b?: string })"
        )
        await Util.expectDecodeUnknownSuccess(schema, {})
        await Util.expectDecodeUnknownSuccess(schema, { a: "a" })
        await Util.expectDecodeUnknownSuccess(schema, { c: "b" }, { b: "b" })
        await Util.expectDecodeUnknownSuccess(schema, { a: "a", c: "b" }, { a: "a", b: "b" })
      })

      it("transformations should throw", () => {
        expect(() =>
          S.partialWith(S.transform(S.String, S.String, { strict: true, decode: identity, encode: identity }), {
            exact: true
          })
        ).toThrow(
          new Error(`Unsupported schema
schema (Transformation): (string <-> string)`)
        )
      })
    })
  })
})
