import * as ParseResult from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { describe, it } from "vitest"

describe("attachPropertySignature", () => {
  it("string keys literal values", async () => {
    const Circle = S.Struct({ radius: S.Number })
    const Square = S.Struct({ sideLength: S.Number })
    const schema = S.Union(
      Circle.pipe(S.attachPropertySignature("kind", "circle")),
      Square.pipe(S.attachPropertySignature("kind", "square"))
    )

    await Util.expectDecodeUnknownSuccess(schema, { radius: 10 }, { kind: "circle", radius: 10 })
    await Util.expectEncodeSuccess(schema, { kind: "circle", radius: 10 }, { radius: 10 })
    await Util.expectDecodeUnknownSuccess(schema, { sideLength: 10 }, { kind: "square", sideLength: 10 })
    await Util.expectEncodeSuccess(schema, { kind: "square", sideLength: 10 }, { sideLength: 10 })
  })

  it("symbol keys literal values", async () => {
    const Circle = S.Struct({ radius: S.Number })
    const Square = S.Struct({ sideLength: S.Number })
    const kind = Symbol.for("@effect/schema/test/kind")
    const schema = S.Union(
      Circle.pipe(S.attachPropertySignature(kind, "circle")),
      Square.pipe(S.attachPropertySignature(kind, "square"))
    )

    await Util.expectDecodeUnknownSuccess(schema, { radius: 10 }, { [kind]: "circle", radius: 10 })
    await Util.expectEncodeSuccess(schema, { [kind]: "circle", radius: 10 }, { radius: 10 })
    await Util.expectDecodeUnknownSuccess(schema, { sideLength: 10 }, { [kind]: "square", sideLength: 10 })
    await Util.expectEncodeSuccess(schema, { [kind]: "square", sideLength: 10 }, { sideLength: 10 })
  })

  it("string keys unique symbols", async () => {
    const Circle = S.Struct({ radius: S.Number })
    const Square = S.Struct({ sideLength: S.Number })
    const kind = Symbol.for("@effect/schema/test/kind")
    const circle = Symbol.for("@effect/schema/test/circle")
    const square = Symbol.for("@effect/schema/test/square")
    const schema = S.Union(
      Circle.pipe(S.attachPropertySignature(kind, circle)),
      Square.pipe(S.attachPropertySignature(kind, square))
    )

    await Util.expectDecodeUnknownSuccess(schema, { radius: 10 }, { [kind]: circle, radius: 10 })
    await Util.expectEncodeSuccess(schema, { [kind]: circle, radius: 10 }, { radius: 10 })
    await Util.expectDecodeUnknownSuccess(schema, { sideLength: 10 }, { [kind]: square, sideLength: 10 })
    await Util.expectEncodeSuccess(schema, { [kind]: square, sideLength: 10 }, { sideLength: 10 })
  })

  it("symbol keys unique symbols", async () => {
    const Circle = S.Struct({ radius: S.Number })
    const Square = S.Struct({ sideLength: S.Number })
    const circle = Symbol.for("@effect/schema/test/circle")
    const square = Symbol.for("@effect/schema/test/square")
    const schema = S.Union(
      Circle.pipe(S.attachPropertySignature("kind", circle)),
      Square.pipe(S.attachPropertySignature("kind", square))
    )

    await Util.expectDecodeUnknownSuccess(schema, { radius: 10 }, { kind: circle, radius: 10 })
    await Util.expectEncodeSuccess(schema, { kind: circle, radius: 10 }, { radius: 10 })
    await Util.expectDecodeUnknownSuccess(schema, { sideLength: 10 }, { kind: square, sideLength: 10 })
    await Util.expectEncodeSuccess(schema, { kind: square, sideLength: 10 }, { sideLength: 10 })
  })

  it("should be compatible with extend", async () => {
    const schema = S.Struct({ a: S.String }).pipe(
      S.attachPropertySignature("_tag", "b"),
      S.extend(S.Struct({ c: S.Number }))
    )
    await Util.expectDecodeUnknownSuccess(schema, { a: "a", c: 1 }, { a: "a", c: 1, _tag: "b" as const })
    await Util.expectEncodeSuccess(schema, { a: "a", c: 1, _tag: "b" as const }, { a: "a", c: 1 })
  })

  it("with a transformation", async () => {
    const From = S.Struct({ radius: S.Number, _isVisible: S.optional(S.Boolean, { exact: true }) })
    const To = S.Struct({ radius: S.Number, _isVisible: S.Boolean })

    const schema = S.transformOrFail(
      From,
      To,
      {
        decode: (input) => ParseResult.mapError(S.decodeUnknown(To)(input), (e) => e.error),
        encode: ({ _isVisible, ...rest }) => ParseResult.succeed(rest)
      }
    ).pipe(
      S.attachPropertySignature("_tag", "Circle")
    )

    await Util.expectDecodeUnknownSuccess(schema, { radius: 10, _isVisible: true }, {
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

  it("annotations", async () => {
    const schema1 = S.Struct({
      a: S.String
    }).pipe(
      S.attachPropertySignature("_tag", "a", { identifier: "AttachedProperty" })
    )
    await Util.expectEncodeFailure(
      schema1,
      null as any,
      `({ a: string } <-> AttachedProperty)
└─ Type side transformation failure
   └─ Expected AttachedProperty, actual null`
    )
    const schema2 = S.attachPropertySignature(
      S.Struct({
        a: S.String
      }),
      "_tag",
      "a",
      { identifier: "AttachedProperty" }
    )
    await Util.expectEncodeFailure(
      schema2,
      null as any,
      `({ a: string } <-> AttachedProperty)
└─ Type side transformation failure
   └─ Expected AttachedProperty, actual null`
    )
  })

  it("decoding error message", async () => {
    const schema = S.Struct({
      a: S.String
    }).pipe(
      S.attachPropertySignature("_tag", "a")
    ).annotations({ identifier: "AttachedProperty" })
    await Util.expectDecodeUnknownFailure(
      schema,
      null,
      `AttachedProperty
└─ Encoded side transformation failure
   └─ Expected { a: string }, actual null`
    )
  })
})
