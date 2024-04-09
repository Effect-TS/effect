import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { identity } from "effect/Function"
import * as Option from "effect/Option"
import { describe, expect, it } from "vitest"

describe("Schema > PropertySignature", () => {
  describe("annotations", () => {
    it("propertySignature(S.string)", () => {
      const schema = S.Struct({
        a: S.propertySignature(S.String).annotations({ description: "a description" }).annotations({ title: "a title" })
      })
      const ast = schema.ast as AST.TypeLiteral
      expect(ast.propertySignatures[0].annotations).toEqual({
        [AST.DescriptionAnnotationId]: "a description",
        [AST.TitleAnnotationId]: "a title"
      })
    })

    it("propertySignature(S.NumberFromString)", () => {
      const schema = S.Struct({
        a: S.propertySignature(S.NumberFromString).annotations({ description: "a description" }).annotations({
          title: "a title"
        })
      })
      const ast = schema.ast as AST.TypeLiteral
      expect(ast.propertySignatures[0].annotations).toEqual({
        [AST.DescriptionAnnotationId]: "a description",
        [AST.TitleAnnotationId]: "a title"
      })
    })

    it("optional(S.string)", () => {
      const schema = S.Struct({
        a: S.optional(S.String).annotations({ description: "a description" }).annotations({ title: "a title" })
      })
      const ast = schema.ast as AST.TypeLiteral
      expect(ast.propertySignatures[0].annotations).toEqual({
        [AST.DescriptionAnnotationId]: "a description",
        [AST.TitleAnnotationId]: "a title"
      })
    })

    it("optional(S.NumberFromString)", () => {
      const schema = S.Struct({
        a: S.optional(S.NumberFromString).annotations({ description: "a description" }).annotations({
          title: "a title"
        })
      })
      const ast = schema.ast as AST.TypeLiteral
      expect(ast.propertySignatures[0].annotations).toEqual({
        [AST.DescriptionAnnotationId]: "a description",
        [AST.TitleAnnotationId]: "a title"
      })
    })

    it("optional(S.string, { default })", () => {
      const schema = S.Struct({
        a: S.optional(S.String, { default: () => "" }).annotations({ description: "a description" }).annotations({
          title: "a title"
        })
      })
      const ast = schema.ast as AST.Transformation
      const to = ast.to as AST.TypeLiteral
      expect(to.propertySignatures[0].annotations).toEqual({
        [AST.DescriptionAnnotationId]: "a description",
        [AST.TitleAnnotationId]: "a title"
      })
    })

    it("optional(S.NumberFromString, { default })", () => {
      const schema = S.Struct({
        a: S.optional(S.NumberFromString, { default: () => 0 }).annotations({ description: "a description" })
          .annotations({ title: "a title" })
      })
      const ast = schema.ast as AST.Transformation
      const to = ast.to as AST.TypeLiteral
      expect(to.propertySignatures[0].annotations).toEqual({
        [AST.DescriptionAnnotationId]: "a description",
        [AST.TitleAnnotationId]: "a title"
      })
    })
  })

  it("add a default to an optional field", async () => {
    const ps: S.PropertySignature<":", number, never, "?:", string, never> = new S.PropertySignatureImpl(
      new S.PropertySignatureTransformation(
        new S.FromPropertySignature(S.NumberFromString.ast, true, true, {}, undefined),
        new S.ToPropertySignature(S.Number.ast, false, true, {}),
        Option.orElse(() => Option.some(0)),
        identity
      )
    )
    const transform = S.Struct({ a: ps })
    const schema = S.asSchema(transform)
    await Util.expectDecodeUnknownSuccess(schema, {}, { a: 0 })
    await Util.expectDecodeUnknownSuccess(schema, { a: "1" }, { a: 1 })
    await Util.expectDecodeUnknownFailure(
      schema,
      { a: "a" },
      `({ a?: NumberFromString } <-> { a: number })
└─ Encoded side transformation failure
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
    const ps: S.PropertySignature<":", number, never, "?:", string, never> = new S.PropertySignatureImpl(
      new S.PropertySignatureTransformation(
        new S.FromPropertySignature(S.NumberFromString.ast, true, true, {}, undefined),
        new S.ToPropertySignature(S.Number.ast, false, true, {}),
        Option.orElse(() => Option.some(0)),
        (o) => Option.flatMap(o, Option.liftPredicate((v) => v !== 0))
      )
    )
    const transform = S.Struct({ a: ps })
    const schema = S.asSchema(transform)
    await Util.expectDecodeUnknownSuccess(schema, {}, { a: 0 })
    await Util.expectDecodeUnknownSuccess(schema, { a: "1" }, { a: 1 })
    await Util.expectDecodeUnknownFailure(
      schema,
      { a: "a" },
      `({ a?: NumberFromString } <-> { a: number })
└─ Encoded side transformation failure
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
    const ps: S.PropertySignature<"?:", string, never, ":", string, never> = new S.PropertySignatureImpl(
      new S.PropertySignatureTransformation(
        new S.FromPropertySignature(S.String.ast, false, true, {}, undefined),
        new S.ToPropertySignature(S.String.ast, true, true, {}),
        Option.flatMap(Option.liftPredicate((v) => v !== "")),
        identity
      )
    )
    const transform = S.Struct({ a: ps })
    const schema = S.asSchema(transform)
    await Util.expectDecodeUnknownSuccess(schema, { a: "" }, {})
    await Util.expectDecodeUnknownSuccess(schema, { a: "a" }, { a: "a" })

    await Util.expectEncodeSuccess(schema, { a: "a" }, { a: "a" })
  })

  it("reversed default", async () => {
    const ps: S.PropertySignature<"?:", number, never, ":", number, never> = new S.PropertySignatureImpl(
      new S.PropertySignatureTransformation(
        new S.FromPropertySignature(S.Number.ast, false, true, {}, undefined),
        new S.ToPropertySignature(S.Number.ast, true, true, {}),
        identity,
        Option.orElse(() => Option.some(0))
      )
    )
    const transform = S.Struct({ a: ps })
    const schema = S.asSchema(transform)
    await Util.expectDecodeUnknownSuccess(schema, { a: 1 }, { a: 1 })
    await Util.expectDecodeUnknownSuccess(schema, { a: 0 }, { a: 0 })

    await Util.expectEncodeSuccess(schema, {}, { a: 0 })
    await Util.expectEncodeSuccess(schema, { a: 1 }, { a: 1 })
  })

  describe("fromKey", () => {
    it("string key", async () => {
      const ps = S.propertySignature(S.Number).pipe(S.fromKey("b"))
      const transform = S.Struct({ a: ps })
      const schema = S.asSchema(transform)
      await Util.expectDecodeUnknownSuccess(schema, { b: 1 }, { a: 1 }, { onExcessProperty: "error" })

      await Util.expectEncodeSuccess(schema, { a: 1 }, { b: 1 }, { onExcessProperty: "error" })
    })

    it("symbol key", async () => {
      const a = Symbol.for("@effect/schema/test/a")
      const ps = S.propertySignature(S.Symbol).pipe(S.fromKey(a))
      const transform = S.Struct({ a: ps })
      const rename = S.asSchema(transform)
      const schema = S.Struct({ b: S.Number }).pipe(S.extend(rename))

      await Util.expectDecodeUnknownSuccess(schema, { [a]: "@effect/schema/test/a", b: 1 }, { a, b: 1 })
      await Util.expectEncodeSuccess(schema, { a, b: 1 }, { [a]: "@effect/schema/test/a", b: 1 })
    })
  })
})
