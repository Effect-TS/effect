import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { identity } from "effect/Function"
import * as Option from "effect/Option"
import { describe, expect, it } from "vitest"

describe("Schema > PropertySignature", () => {
  describe("annotations", () => {
    it("propertySignatureDeclaration().annotations()", () => {
      const schema = S.struct({
        a: S.propertySignatureDeclaration(S.string).annotations({
          title: "title",
          [Symbol.for("custom-annotation")]: "custom-annotation-value"
        })
      })
      const ast: any = schema.ast
      expect(ast.propertySignatures[0].annotations).toEqual({
        [AST.TitleAnnotationId]: "title",
        [Symbol.for("custom-annotation")]: "custom-annotation-value"
      })
    })

    it("optional().annotations()", () => {
      const schema = S.struct({
        a: S.optional(S.string).annotations({
          title: "title",
          [Symbol.for("custom-annotation")]: "custom-annotation-value"
        })
      })
      const ast: any = schema.ast
      expect(ast.propertySignatures[0].annotations).toEqual({
        [AST.TitleAnnotationId]: "title",
        [Symbol.for("custom-annotation")]: "custom-annotation-value"
      })
    })

    it("should return the same reference when using .annotations(undefined)", () => {
      const ps = S.propertySignatureDeclaration(S.string)
      const copy = ps.annotations(undefined)
      expect(ps === copy).toBe(true)
    })
  })

  it("add a default to an optional field", async () => {
    const ps = S.propertySignatureTransformation(
      S.NumberFromString,
      "?:",
      S.number,
      ":",
      Option.orElse(() => Option.some(0)),
      identity
    )
    const transform = S.struct({ a: ps })
    const schema = S.asSchema(transform)
    await Util.expectDecodeUnknownSuccess(schema, {}, { a: 0 })
    await Util.expectDecodeUnknownSuccess(schema, { a: "1" }, { a: 1 })
    await Util.expectDecodeUnknownFailure(
      schema,
      { a: "a" },
      `({ a?: NumberFromString } <-> { a: number })
└─ From side transformation failure
   └─ { a?: NumberFromString }
      └─ ["a"]
         └─ NumberFromString
            └─ Transformation process failure
               └─ Expected NumberFromString, actual "a"`
    )

    await Util.expectEncodeSuccess(schema, { a: 1 }, { a: "1" })
    await Util.expectEncodeSuccess(schema, { a: 0 }, { a: "0" })
  })

  it("add a bidirectional default to an optional field", async () => {
    const ps = S.propertySignatureTransformation(
      S.NumberFromString,
      "?:",
      S.number,
      ":",
      Option.orElse(() => Option.some(0)),
      (o) => Option.flatMap(o, Option.liftPredicate((v) => v !== 0))
    )
    const transform = S.struct({ a: ps })
    const schema = S.asSchema(transform)
    await Util.expectDecodeUnknownSuccess(schema, {}, { a: 0 })
    await Util.expectDecodeUnknownSuccess(schema, { a: "1" }, { a: 1 })
    await Util.expectDecodeUnknownFailure(
      schema,
      { a: "a" },
      `({ a?: NumberFromString } <-> { a: number })
└─ From side transformation failure
   └─ { a?: NumberFromString }
      └─ ["a"]
         └─ NumberFromString
            └─ Transformation process failure
               └─ Expected NumberFromString, actual "a"`
    )

    await Util.expectEncodeSuccess(schema, { a: 1 }, { a: "1" })
    await Util.expectEncodeSuccess(schema, { a: 0 }, {})
  })

  it("empty string as optional", async () => {
    const ps = S.propertySignatureTransformation(
      S.string,
      ":",
      S.string,
      "?:",
      Option.flatMap(Option.liftPredicate((v) => v !== "")),
      identity
    )
    const transform = S.struct({ a: ps })
    const schema = S.asSchema(transform)
    await Util.expectDecodeUnknownSuccess(schema, { a: "" }, {})
    await Util.expectDecodeUnknownSuccess(schema, { a: "a" }, { a: "a" })

    await Util.expectEncodeSuccess(schema, { a: "a" }, { a: "a" })
  })

  it("reversed default", async () => {
    const ps = S.propertySignatureTransformation(
      S.number,
      ":",
      S.number,
      "?:",
      identity,
      Option.orElse(() => Option.some(0))
    )
    const transform = S.struct({ a: ps })
    const schema = S.asSchema(transform)
    await Util.expectDecodeUnknownSuccess(schema, { a: 1 }, { a: 1 })
    await Util.expectDecodeUnknownSuccess(schema, { a: 0 }, { a: 0 })

    await Util.expectEncodeSuccess(schema, {}, { a: 0 })
    await Util.expectEncodeSuccess(schema, { a: 1 }, { a: 1 })
  })

  describe("renaming", () => {
    it("string key", async () => {
      const ps = S.propertySignatureDeclaration(S.number).pipe(S.propertySignatureKey("b"))
      const transform = S.struct({ a: ps })
      const schema = S.asSchema(transform)
      await Util.expectDecodeUnknownSuccess(schema, { b: 1 }, { a: 1 }, { onExcessProperty: "error" })

      await Util.expectEncodeSuccess(schema, { a: 1 }, { b: 1 }, { onExcessProperty: "error" })
    })

    it("symbol key", async () => {
      const a = Symbol.for("@effect/schema/test/a")
      const ps = S.propertySignatureDeclaration(S.symbol).pipe(S.propertySignatureKey(a))
      const transform = S.struct({ a: ps })
      const rename = S.asSchema(transform)
      const schema = S.struct({ b: S.number }).pipe(S.extend(rename))

      await Util.expectDecodeUnknownSuccess(schema, { [a]: "@effect/schema/test/a", b: 1 }, { a, b: 1 })
      await Util.expectEncodeSuccess(schema, { a, b: 1 }, { [a]: "@effect/schema/test/a", b: 1 })
    })
  })
})
