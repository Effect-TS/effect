import { describe, it } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"
import * as S from "effect/Schema"
import * as Util from "../TestUtils.js"

describe("withDecodingDefault", () => {
  describe("PropertySignatureDeclaration", () => {
    it("optional", async () => {
      const prop = S.optional(S.String).pipe(S.withDecodingDefault(() => ""))
      const schema = S.Struct({ a: prop })
      await Util.assertions.decoding.succeed(schema, {}, { a: "" })
      await Util.assertions.decoding.succeed(schema, { a: undefined }, { a: "" })
      await Util.assertions.decoding.succeed(schema, { a: "a" })
    })

    it("optionalWith { exact: true }", async () => {
      const prop = S.optionalWith(S.String, { exact: true }).pipe(S.withDecodingDefault(() => ""))
      const schema = S.Struct({ a: prop })
      await Util.assertions.decoding.succeed(schema, {}, { a: "" })
      await Util.assertions.decoding.succeed(schema, { a: "a" })
    })

    it("should prune undefined from the type", () => {
      const prop1 = S.optional(S.String).pipe(S.withDecodingDefault(() => ""))
      strictEqual(String(prop1), `PropertySignature<":", string, never, "?:", string | undefined>`)

      const prop2 = S.optional(S.NumberFromString).pipe(S.withDecodingDefault(() => 0))
      strictEqual(String(prop2), `PropertySignature<":", number, never, "?:", NumberFromString | undefined>`)
    })
  })

  describe("PropertySignatureTransformation", () => {
    it("optional", async () => {
      const prop = S.optional(S.String).pipe(S.fromKey("b"), S.withDecodingDefault(() => ""))
      const schema = S.Struct({ a: prop })
      await Util.assertions.decoding.succeed(schema, {}, { a: "" })
      await Util.assertions.decoding.succeed(schema, { b: undefined }, { a: "" })
      await Util.assertions.decoding.succeed(schema, { b: "a" }, { a: "a" })
    })

    it("optionalWith { exact: true }", async () => {
      const prop = S.optionalWith(S.String, { exact: true }).pipe(
        S.fromKey("b"),
        S.withDecodingDefault(() => "")
      )
      const schema = S.Struct({ a: prop })
      await Util.assertions.decoding.succeed(schema, {}, { a: "" })
      await Util.assertions.decoding.succeed(schema, { b: "a" }, { a: "a" })
    })

    it("should prune undefined from the type", () => {
      const prop1 = S.optional(S.String).pipe(S.fromKey("a"), S.withDecodingDefault(() => ""))
      strictEqual(String(prop1), `PropertySignature<":", string, "a", "?:", string | undefined>`)

      const prop2 = S.optional(S.NumberFromString).pipe(S.fromKey("a"), S.withDecodingDefault(() => 0))
      strictEqual(String(prop2), `PropertySignature<":", number, "a", "?:", NumberFromString | undefined>`)
    })
  })
})
