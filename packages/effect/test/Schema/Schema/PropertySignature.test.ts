import { describe, it } from "@effect/vitest"
import { deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { identity } from "effect/Function"
import * as Option from "effect/Option"
import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"
import * as Util from "../TestUtils.js"

describe("PropertySignature", () => {
  it("should expose a from property", () => {
    const schema = S.propertySignature(S.String)
    strictEqual(schema.from, S.String)
  })

  it("should expose a from property after an annotations call", () => {
    const schema = S.propertySignature(S.String).annotations({})
    strictEqual(schema.from, S.String)
  })

  it("toString", () => {
    strictEqual(
      String(S.optional(S.String)),
      `PropertySignature<"?:", string | undefined, never, "?:", string | undefined>`
    )
    strictEqual(
      String(S.optional(S.String).pipe(S.fromKey("a"))),
      `PropertySignature<"?:", string | undefined, "a", "?:", string | undefined>`
    )
  })

  describe("annotations", () => {
    it("propertySignature(S.string)", () => {
      const schema = S.Struct({
        a: S.propertySignature(S.String).annotations({ description: "a description" }).annotations({ title: "a title" })
      })
      const ast = schema.ast as AST.TypeLiteral
      deepStrictEqual(ast.propertySignatures[0].annotations, {
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
      deepStrictEqual(ast.propertySignatures[0].annotations, {
        [AST.DescriptionAnnotationId]: "a description",
        [AST.TitleAnnotationId]: "a title"
      })
    })

    it("optional(S.string)", () => {
      const schema = S.Struct({
        a: S.optional(S.String).annotations({ description: "a description" }).annotations({ title: "a title" })
      })
      const ast = schema.ast as AST.TypeLiteral
      deepStrictEqual(ast.propertySignatures[0].annotations, {
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
      deepStrictEqual(ast.propertySignatures[0].annotations, {
        [AST.DescriptionAnnotationId]: "a description",
        [AST.TitleAnnotationId]: "a title"
      })
    })

    it("optionalWith(S.string, { default })", () => {
      const schema = S.Struct({
        a: S.optionalWith(S.String, { default: () => "" }).annotations({ description: "a description" }).annotations({
          title: "a title"
        })
      })
      const ast = schema.ast as AST.Transformation
      const to = ast.to as AST.TypeLiteral
      deepStrictEqual(to.propertySignatures[0].annotations, {
        [AST.DescriptionAnnotationId]: "a description",
        [AST.TitleAnnotationId]: "a title"
      })
    })

    it("optionalWith(S.NumberFromString, { default })", () => {
      const schema = S.Struct({
        a: S.optionalWith(S.NumberFromString, { default: () => 0 }).annotations({ description: "a description" })
          .annotations({ title: "a title" })
      })
      const ast = schema.ast as AST.Transformation
      const to = ast.to as AST.TypeLiteral
      deepStrictEqual(to.propertySignatures[0].annotations, {
        [AST.DescriptionAnnotationId]: "a description",
        [AST.TitleAnnotationId]: "a title"
      })
    })
  })

  it("add a decoding default to an optional field", async () => {
    const ps: S.PropertySignature<":", number, never, "?:", string, never> = S.makePropertySignature(
      new S.PropertySignatureTransformation(
        new S.FromPropertySignature(S.NumberFromString.ast, true, true, {}, undefined),
        new S.ToPropertySignature(S.Number.ast, false, true, {}, undefined),
        Option.orElse(() => Option.some(0)),
        identity
      )
    )
    const transform = S.Struct({ a: ps })
    const schema = S.asSchema(transform)
    await Util.assertions.decoding.succeed(schema, {}, { a: 0 })
    await Util.assertions.decoding.succeed(schema, { a: "1" }, { a: 1 })
    await Util.assertions.decoding.fail(
      schema,
      { a: "a" },
      `(Struct (Encoded side) <-> Struct (Type side))
└─ Encoded side transformation failure
   └─ Struct (Encoded side)
      └─ ["a"]
         └─ NumberFromString
            └─ Transformation process failure
               └─ Unable to decode "a" into a number`
    )

    await Util.assertions.encoding.succeed(schema, { a: 1 }, { a: "1" })
    await Util.assertions.encoding.succeed(schema, { a: 0 }, { a: "0" })
  })

  it("add a bidirectional (decoding/encoding) default to an optional field", async () => {
    const ps: S.PropertySignature<":", number, never, "?:", string, never> = S.makePropertySignature(
      new S.PropertySignatureTransformation(
        new S.FromPropertySignature(S.NumberFromString.ast, true, true, {}, undefined),
        new S.ToPropertySignature(S.Number.ast, false, true, {}, undefined),
        Option.orElse(() => Option.some(0)),
        (o) => Option.flatMap(o, Option.liftPredicate((v) => v !== 0))
      )
    )
    const transform = S.Struct({ a: ps })
    const schema = S.asSchema(transform)
    await Util.assertions.decoding.succeed(schema, {}, { a: 0 })
    await Util.assertions.decoding.succeed(schema, { a: "1" }, { a: 1 })
    await Util.assertions.decoding.fail(
      schema,
      { a: "a" },
      `(Struct (Encoded side) <-> Struct (Type side))
└─ Encoded side transformation failure
   └─ Struct (Encoded side)
      └─ ["a"]
         └─ NumberFromString
            └─ Transformation process failure
               └─ Unable to decode "a" into a number`
    )

    await Util.assertions.encoding.succeed(schema, { a: 1 }, { a: "1" })
    await Util.assertions.encoding.succeed(schema, { a: 0 }, {})
  })

  it("empty string as optional", async () => {
    const ps: S.PropertySignature<"?:", string, never, ":", string, never> = S.makePropertySignature(
      new S.PropertySignatureTransformation(
        new S.FromPropertySignature(S.String.ast, false, true, {}, undefined),
        new S.ToPropertySignature(S.String.ast, true, true, {}, undefined),
        Option.flatMap(Option.liftPredicate((v) => v !== "")),
        identity
      )
    )
    const transform = S.Struct({ a: ps })
    const schema = S.asSchema(transform)
    await Util.assertions.decoding.succeed(schema, { a: "" }, {})
    await Util.assertions.decoding.succeed(schema, { a: "a" }, { a: "a" })

    await Util.assertions.encoding.succeed(schema, { a: "a" }, { a: "a" })
  })

  it("encoding default", async () => {
    const ps: S.PropertySignature<"?:", number, never, ":", number, never> = S.makePropertySignature(
      new S.PropertySignatureTransformation(
        new S.FromPropertySignature(S.Number.ast, false, true, {}, undefined),
        new S.ToPropertySignature(S.Number.ast, true, true, {}, undefined),
        identity,
        Option.orElse(() => Option.some(0))
      )
    )
    const transform = S.Struct({ a: ps })
    const schema = S.asSchema(transform)
    await Util.assertions.decoding.succeed(schema, { a: 1 }, { a: 1 })
    await Util.assertions.decoding.succeed(schema, { a: 0 }, { a: 0 })

    await Util.assertions.encoding.succeed(schema, {}, { a: 0 })
    await Util.assertions.encoding.succeed(schema, { a: 1 }, { a: 1 })
  })

  describe("fromKey", () => {
    it("string key", async () => {
      const ps = S.propertySignature(S.Number).pipe(S.fromKey("b"))
      const transform = S.Struct({ a: ps })
      const schema = S.asSchema(transform)
      await Util.assertions.decoding.succeed(schema, { b: 1 }, { a: 1 }, { parseOptions: Util.onExcessPropertyError })

      await Util.assertions.encoding.succeed(schema, { a: 1 }, { b: 1 }, { parseOptions: Util.onExcessPropertyError })
    })

    it("symbol key", async () => {
      const a = Symbol.for("effect/Schema/test/a")
      const ps = S.propertySignature(S.Symbol).pipe(S.fromKey(a))
      const transform = S.Struct({ a: ps })
      const rename = S.asSchema(transform)
      const schema = S.Struct({ b: S.Number }).pipe(S.extend(rename))

      await Util.assertions.decoding.succeed(schema, { [a]: "effect/Schema/test/a", b: 1 }, { a, b: 1 })
      await Util.assertions.encoding.succeed(schema, { a, b: 1 }, { [a]: "effect/Schema/test/a", b: 1 })
    })
  })
})
