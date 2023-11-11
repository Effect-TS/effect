import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as E from "effect/Either"
import { describe, it } from "vitest"

describe("Schema/attachPropertySignature", () => {
  it("string keys + literal values", async () => {
    const Circle = S.struct({ radius: S.number })
    const Square = S.struct({ sideLength: S.number })
    const schema = S.union(
      Circle.pipe(S.attachPropertySignature("kind", "circle")),
      Square.pipe(S.attachPropertySignature("kind", "square"))
    )

    await Util.expectParseSuccess(schema, { radius: 10 }, { kind: "circle", radius: 10 })
    await Util.expectEncodeSuccess(schema, { kind: "circle", radius: 10 }, { radius: 10 })
    await Util.expectParseSuccess(schema, { sideLength: 10 }, { kind: "square", sideLength: 10 })
    await Util.expectEncodeSuccess(schema, { kind: "square", sideLength: 10 }, { sideLength: 10 })
  })

  it("symbol keys + literal values", async () => {
    const Circle = S.struct({ radius: S.number })
    const Square = S.struct({ sideLength: S.number })
    const kind = Symbol.for("@effect/schema/test/kind")
    const schema = S.union(
      Circle.pipe(S.attachPropertySignature(kind, "circle")),
      Square.pipe(S.attachPropertySignature(kind, "square"))
    )

    await Util.expectParseSuccess(schema, { radius: 10 }, { [kind]: "circle", radius: 10 })
    await Util.expectEncodeSuccess(schema, { [kind]: "circle", radius: 10 }, { radius: 10 })
    await Util.expectParseSuccess(schema, { sideLength: 10 }, { [kind]: "square", sideLength: 10 })
    await Util.expectEncodeSuccess(schema, { [kind]: "square", sideLength: 10 }, { sideLength: 10 })
  })

  it("string keys + unique symbols", async () => {
    const Circle = S.struct({ radius: S.number })
    const Square = S.struct({ sideLength: S.number })
    const kind = Symbol.for("@effect/schema/test/kind")
    const circle = Symbol.for("@effect/schema/test/circle")
    const square = Symbol.for("@effect/schema/test/square")
    const schema = S.union(
      Circle.pipe(S.attachPropertySignature(kind, circle)),
      Square.pipe(S.attachPropertySignature(kind, square))
    )

    await Util.expectParseSuccess(schema, { radius: 10 }, { [kind]: circle, radius: 10 })
    await Util.expectEncodeSuccess(schema, { [kind]: circle, radius: 10 }, { radius: 10 })
    await Util.expectParseSuccess(schema, { sideLength: 10 }, { [kind]: square, sideLength: 10 })
    await Util.expectEncodeSuccess(schema, { [kind]: square, sideLength: 10 }, { sideLength: 10 })
  })

  it("symbol keys + unique symbols", async () => {
    const Circle = S.struct({ radius: S.number })
    const Square = S.struct({ sideLength: S.number })
    const circle = Symbol.for("@effect/schema/test/circle")
    const square = Symbol.for("@effect/schema/test/square")
    const schema = S.union(
      Circle.pipe(S.attachPropertySignature("kind", circle)),
      Square.pipe(S.attachPropertySignature("kind", square))
    )

    await Util.expectParseSuccess(schema, { radius: 10 }, { kind: circle, radius: 10 })
    await Util.expectEncodeSuccess(schema, { kind: circle, radius: 10 }, { radius: 10 })
    await Util.expectParseSuccess(schema, { sideLength: 10 }, { kind: square, sideLength: 10 })
    await Util.expectEncodeSuccess(schema, { kind: square, sideLength: 10 }, { sideLength: 10 })
  })

  it("should be compatible with extend", async () => {
    const schema = S.struct({ a: S.string }).pipe(
      S.attachPropertySignature("_tag", "b"),
      S.extend(S.struct({ c: S.number }))
    )
    await Util.expectParseSuccess(schema, { a: "a", c: 1 }, { a: "a", c: 1, _tag: "b" as const })
    await Util.expectEncodeSuccess(schema, { a: "a", c: 1, _tag: "b" as const }, { a: "a", c: 1 })
  })

  it("with a transformation", async () => {
    const From = S.struct({ radius: S.number, _isVisible: S.optional(S.boolean) })
    const To = S.struct({ radius: S.number, _isVisible: S.boolean })

    const schema = S.transformOrFail(
      From,
      To,
      S.parseEither(To),
      ({ _isVisible, ...rest }) => E.right(rest)
    ).pipe(
      S.attachPropertySignature("_tag", "Circle")
    )

    await Util.expectParseSuccess(schema, { radius: 10, _isVisible: true }, {
      _tag: "Circle" as const,
      _isVisible: true,
      radius: 10
    })
    await Util.expectEncodeSuccess(schema, {
      _tag: "Circle" as const,
      radius: 10,
      _isVisible: true
    }, {
      radius: 10
    })
  })
})
