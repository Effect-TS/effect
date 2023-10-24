import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as O from "effect/Option"
import { describe, expect, it } from "vitest"

describe("optional", () => {
  it("should add annotations (optional)", () => {
    const schema = S.struct({
      a: S.optional(S.string, { [Symbol.for("custom-annotation")]: "custom-annotation-value" })
    })
    const ast: any = schema.ast
    expect(ast.propertySignatures[0].annotations).toEqual({
      [Symbol.for("custom-annotation")]: "custom-annotation-value"
    })
  })

  it("should add annotations (optional + withDefault)", () => {
    const schema = S.struct({
      a: S.optional(S.string, { [Symbol.for("custom-annotation")]: "custom-annotation-value" })
        .withDefault(() => "")
    })
    const ast: any = schema.ast
    expect(ast.to.propertySignatures[0].annotations).toEqual({
      [Symbol.for("custom-annotation")]: "custom-annotation-value"
    })
  })

  it("should add annotations (optional + toOption)", () => {
    const schema = S.struct({
      a: S.optional(S.string, { [Symbol.for("custom-annotation")]: "custom-annotation-value" })
        .toOption()
    })
    const ast: any = schema.ast
    expect(ast.to.propertySignatures[0].annotations).toEqual({
      [Symbol.for("custom-annotation")]: "custom-annotation-value"
    })
  })

  it("case Default", async () => {
    const transform = S.struct({
      a: S.optional(S.NumberFromString).withDefault(() => 0)
    })
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

  it("case Option", async () => {
    const transform = S.struct({ a: S.optional(S.NumberFromString).toOption() })
    await Util.expectParseSuccess(transform, {}, { a: O.none() })
    await Util.expectParseSuccess(transform, { a: "1" }, { a: O.some(1) })
    await Util.expectParseFailure(transform, {
      a: "a"
    }, `/a Expected string <-> number, actual "a"`)

    await Util.expectEncodeSuccess(transform, { a: O.some(1) }, { a: "1" })
    await Util.expectEncodeSuccess(transform, { a: O.none() }, {})
  })

  it("never", async () => {
    const schema = S.struct({ a: S.optional(S.never), b: S.number })
    await Util.expectParseSuccess(schema, { b: 1 })
    await Util.expectParseFailure(schema, { a: "a", b: 1 }, `/a Expected never, actual "a"`)
  })

  it("all", async () => {
    const transform = S.struct({
      a: S.boolean,
      b: S.optional(S.NumberFromString),
      c: S.optional(S.Trim).withDefault(() => "-"),
      d: S.optional(S.Date).toOption()
    })
    await Util.expectParseSuccess(transform, { a: true }, { a: true, c: "-", d: O.none() })
    await Util.expectParseSuccess(transform, { a: true, b: "1" }, {
      a: true,
      b: 1,
      c: "-",
      d: O.none()
    })
    await Util.expectParseSuccess(transform, { a: true, c: "a" }, { a: true, c: "a", d: O.none() })
    await Util.expectParseSuccess(transform, { a: true, d: "1970-01-01T00:00:00.000Z" }, {
      a: true,
      c: "-",
      d: O.some(new Date(0))
    })
    await Util.expectParseSuccess(transform, { a: true, c: "a", d: "1970-01-01T00:00:00.000Z" }, {
      a: true,
      c: "a",
      d: O.some(new Date(0))
    })
    await Util.expectParseSuccess(transform, {
      a: true,
      c: "a",
      d: "1970-01-01T00:00:00.000Z",
      b: "1"
    }, {
      a: true,
      b: 1,
      c: "a",
      d: O.some(new Date(0))
    })
  })
})
