import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("withDecodingDefault", () => {
  describe("PropertySignatureDeclaration", () => {
    it("optional", async () => {
      const prop = S.optional(S.String).pipe(S.withDecodingDefault(() => ""))
      const schema = S.Struct({ a: prop })
      await Util.expectDecodeUnknownSuccess(schema, {}, { a: "" })
      await Util.expectDecodeUnknownSuccess(schema, { a: undefined }, { a: "" })
      await Util.expectDecodeUnknownSuccess(schema, { a: "a" })
    })

    it("optionalWith { exact: true }", async () => {
      const prop = S.optionalWith(S.String, { exact: true }).pipe(S.withDecodingDefault(() => ""))
      const schema = S.Struct({ a: prop })
      await Util.expectDecodeUnknownSuccess(schema, {}, { a: "" })
      await Util.expectDecodeUnknownSuccess(schema, { a: "a" })
    })

    it("should prune undefined from the type", () => {
      const prop1 = S.optional(S.String).pipe(S.withDecodingDefault(() => ""))
      expect(String(prop1)).toBe(`PropertySignature<":", string, never, "?:", string | undefined>`)

      const prop2 = S.optional(S.NumberFromString).pipe(S.withDecodingDefault(() => 0))
      expect(String(prop2)).toBe(`PropertySignature<":", number, never, "?:", NumberFromString | undefined>`)
    })
  })

  describe("PropertySignatureTransformation", () => {
    it("optional", async () => {
      const prop = S.optional(S.String).pipe(S.fromKey("b"), S.withDecodingDefault(() => ""))
      const schema = S.Struct({ a: prop })
      await Util.expectDecodeUnknownSuccess(schema, {}, { a: "" })
      await Util.expectDecodeUnknownSuccess(schema, { b: undefined }, { a: "" })
      await Util.expectDecodeUnknownSuccess(schema, { b: "a" }, { a: "a" })
    })

    it("optionalWith { exact: true }", async () => {
      const prop = S.optionalWith(S.String, { exact: true }).pipe(
        S.fromKey("b"),
        S.withDecodingDefault(() => "")
      )
      const schema = S.Struct({ a: prop })
      await Util.expectDecodeUnknownSuccess(schema, {}, { a: "" })
      await Util.expectDecodeUnknownSuccess(schema, { b: "a" }, { a: "a" })
    })

    it("should prune undefined from the type", () => {
      const prop1 = S.optional(S.String).pipe(S.fromKey("a"), S.withDecodingDefault(() => ""))
      expect(String(prop1)).toBe(`PropertySignature<":", string, "a", "?:", string | undefined>`)

      const prop2 = S.optional(S.NumberFromString).pipe(S.fromKey("a"), S.withDecodingDefault(() => 0))
      expect(String(prop2)).toBe(`PropertySignature<":", number, "a", "?:", NumberFromString | undefined>`)
    })
  })
})
