import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

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
  })
})
