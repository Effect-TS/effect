import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("partial", () => {
  it("Struct", async () => {
    const schema = S.partial(S.Struct({ a: S.Number }))
    await Util.expectDecodeUnknownSuccess(schema, {})
    await Util.expectDecodeUnknownSuccess(schema, { a: 1 })
    await Util.expectDecodeUnknownSuccess(schema, { a: undefined })

    await Util.expectDecodeUnknownFailure(
      schema,
      { a: null },
      `{ readonly a?: number | undefined }
└─ ["a"]
   └─ number | undefined
      ├─ Expected number, actual null
      └─ Expected undefined, actual null`
    )
  })

  it("Record", async () => {
    const schema = S.partial(S.Record({ key: S.String, value: S.NumberFromString }))
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
      ├─ Expected number, actual "a"
      └─ Expected undefined, actual "a"`
    )
  })

  describe("unsupported schemas", () => {
    it("declarations should throw", () => {
      expect(() => S.partial(S.OptionFromSelf(S.String))).toThrow(
        new Error(`Unsupported schema
schema (Declaration): Option<string>`)
      )
    })

    it("refinements should throw", () => {
      expect(() => S.partial(S.String.pipe(S.minLength(2)))).toThrow(
        new Error(`Unsupported schema
schema (Refinement): minLength(2)`)
      )
    })

    describe("Transformation", () => {
      it("should support property key renamings", async () => {
        const original = S.Struct({
          a: S.String,
          b: S.propertySignature(S.String).pipe(S.fromKey("c"))
        })
        const schema = S.partial(original)
        expect(S.format(schema)).toBe(
          "({ readonly a?: string | undefined; readonly c?: string | undefined } <-> { readonly a?: string | undefined; readonly b?: string | undefined })"
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
    })
  })
})
