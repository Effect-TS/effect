import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { identity } from "effect/Function"
import * as O from "effect/Option"
import { describe, it } from "vitest"

describe("Schema/PropertySignatureTransformations", () => {
  it("default", async () => {
    const transform: S.Schema<{ readonly a?: string }, { readonly a: number }> = S.make(
      AST.createTransform(
        S.struct({ a: S.optional(S.NumberFromString) }).ast,
        S.struct({ a: S.number }).ast,
        AST.createTypeLiteralTransformation(
          [
            AST.createPropertySignatureTransform(
              "a",
              "a",
              AST.createFinalPropertySignatureTransformation(
                O.orElse(() => O.some(0)),
                identity
              )
            )
          ]
        )
      )
    )
    await Util.expectParseSuccess(transform, {}, { a: 0 })
    await Util.expectParseSuccess(transform, { a: "1" }, { a: 1 })
    await Util.expectParseFailure(
      transform,
      { a: "a" },
      `/a Expected string <-> number, actual "a"`
    )

    await Util.expectEncodeSuccess(transform, { a: 1 }, { a: "1" })
    await Util.expectEncodeSuccess(transform, { a: 0 }, { a: "0" })
  })

  it("bidirectional default", async () => {
    const transform: S.Schema<{ readonly a?: string }, { readonly a: number }> = S.make(
      AST.createTransform(
        S.struct({ a: S.optional(S.NumberFromString) }).ast,
        S.struct({ a: S.number }).ast,
        AST.createTypeLiteralTransformation(
          [
            AST.createPropertySignatureTransform(
              "a",
              "a",
              AST.createFinalPropertySignatureTransformation(
                O.orElse(() => O.some(0)),
                (o) => O.flatMap(o, O.liftPredicate((v) => v !== 0))
              )
            )
          ]
        )
      )
    )
    await Util.expectParseSuccess(transform, {}, { a: 0 })
    await Util.expectParseSuccess(transform, { a: "1" }, { a: 1 })
    await Util.expectParseFailure(
      transform,
      { a: "a" },
      `/a Expected string <-> number, actual "a"`
    )

    await Util.expectEncodeSuccess(transform, { a: 1 }, { a: "1" })
    await Util.expectEncodeSuccess(transform, { a: 0 }, {})
  })

  it("optional -> Option", async () => {
    const transform: S.Schema<{ readonly a?: string }, { readonly a: O.Option<number> }> = S
      .make(
        AST.createTransform(
          S.struct({ a: S.optional(S.NumberFromString) }).ast,
          S.struct({ a: S.optionFromSelf(S.number) }).ast,
          AST.createTypeLiteralTransformation(
            [
              AST.createPropertySignatureTransform(
                "a",
                "a",
                AST.createFinalPropertySignatureTransformation(
                  O.some,
                  O.flatten
                )
              )
            ]
          )
        )
      )
    await Util.expectParseSuccess(transform, {}, { a: O.none() })
    await Util.expectParseSuccess(transform, { a: "1" }, { a: O.some(1) })
    await Util.expectParseFailure(
      transform,
      { a: "a" },
      `/a Expected string <-> number, actual "a"`
    )

    await Util.expectEncodeSuccess(transform, { a: O.some(1) }, { a: "1" })
    await Util.expectEncodeSuccess(transform, { a: O.none() }, {})
  })

  it("empty string as optional", async () => {
    const transform: S.Schema<{ readonly a: string }, { readonly a?: string }> = S.make(
      AST.createTransform(
        S.struct({ a: S.string }).ast,
        S.struct({ a: S.optional(S.string) }).ast,
        AST.createTypeLiteralTransformation(
          [
            AST.createPropertySignatureTransform(
              "a",
              "a",
              AST.createFinalPropertySignatureTransformation(
                O.flatMap(O.liftPredicate((v) => v !== "")),
                identity
              )
            )
          ]
        )
      )
    )
    await Util.expectParseSuccess(transform, { a: "" }, {})
    await Util.expectParseSuccess(transform, { a: "a" }, { a: "a" })

    await Util.expectEncodeSuccess(transform, { a: "a" }, { a: "a" })
  })

  it("rename", async () => {
    const transform: S.Schema<{ readonly a: number }, { readonly b: number }> = S.make(
      AST.createTransform(
        S.struct({ a: S.number }).ast,
        S.struct({ b: S.number }).ast,
        AST.createTypeLiteralTransformation(
          [
            AST.createPropertySignatureTransform(
              "a",
              "b",
              AST.createFinalPropertySignatureTransformation(
                identity,
                identity
              )
            )
          ]
        )
      )
    )
    await Util.expectParseSuccess(transform, { a: 1 }, { b: 1 }, { onExcessProperty: "error" })

    await Util.expectEncodeSuccess(transform, { b: 1 }, { a: 1 }, { onExcessProperty: "error" })
  })

  it("rename transformation", async () => {
    const a = Symbol.for("@effect/schema/test/a")
    const rename: S.Schema<{ readonly a: string }, { readonly [a]: symbol }> = S.make(
      AST.createTransform(
        S.struct({ a: S.string }).ast,
        S.struct({ [a]: S.symbol }).ast,
        AST.createTypeLiteralTransformation(
          [
            AST.createPropertySignatureTransform(
              "a",
              a,
              AST.createFinalPropertySignatureTransformation(
                identity,
                identity
              )
            )
          ]
        )
      )
    )
    const schema = S.struct({ b: S.number }).pipe(S.extend(rename))

    await Util.expectParseSuccess(schema, { a: "@effect/schema/test/a", b: 1 }, { [a]: a, b: 1 })
    await Util.expectEncodeSuccess(schema, { [a]: a, b: 1 }, { a: "@effect/schema/test/a", b: 1 })
  })

  it("reversed default", async () => {
    const transform: S.Schema<{ readonly a: string }, { readonly a?: number }> = S.make(
      AST.createTransform(
        S.struct({ a: S.number }).ast,
        S.struct({ a: S.optional(S.number) }).ast,
        AST.createTypeLiteralTransformation(
          [
            AST.createPropertySignatureTransform(
              "a",
              "a",
              AST.createFinalPropertySignatureTransformation(
                identity,
                O.orElse(() => O.some(0))
              )
            )
          ]
        )
      )
    )
    await Util.expectParseSuccess(transform, { a: 1 }, { a: 1 })
    await Util.expectParseSuccess(transform, { a: 0 }, { a: 0 })

    await Util.expectEncodeSuccess(transform, {}, { a: 0 })
    await Util.expectEncodeSuccess(transform, { a: 1 }, { a: 1 })
  })
})
