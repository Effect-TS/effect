import { describe, it } from "@effect/vitest"
import * as ParseResult from "effect/ParseResult"
import * as S from "effect/Schema"
import * as Util from "../TestUtils.js"

describe("attachPropertySignature", () => {
  it("string keys literal values", async () => {
    const Circle = S.Struct({ radius: S.Number })
    const Square = S.Struct({ sideLength: S.Number })
    const schema = S.Union(
      Circle.pipe(S.attachPropertySignature("kind", "circle")),
      Square.pipe(S.attachPropertySignature("kind", "square"))
    )

    await Util.assertions.decoding.succeed(schema, { radius: 10 }, { kind: "circle", radius: 10 })
    await Util.assertions.encoding.succeed(schema, { kind: "circle", radius: 10 }, { radius: 10 })
    await Util.assertions.decoding.succeed(schema, { sideLength: 10 }, { kind: "square", sideLength: 10 })
    await Util.assertions.encoding.succeed(schema, { kind: "square", sideLength: 10 }, { sideLength: 10 })
  })

  it("symbol keys literal values", async () => {
    const Circle = S.Struct({ radius: S.Number })
    const Square = S.Struct({ sideLength: S.Number })
    const kind = Symbol.for("effect/Schema/test/kind")
    const schema = S.Union(
      Circle.pipe(S.attachPropertySignature(kind, "circle")),
      Square.pipe(S.attachPropertySignature(kind, "square"))
    )

    await Util.assertions.decoding.succeed(schema, { radius: 10 }, { [kind]: "circle", radius: 10 })
    await Util.assertions.encoding.succeed(schema, { [kind]: "circle", radius: 10 }, { radius: 10 })
    await Util.assertions.decoding.succeed(schema, { sideLength: 10 }, { [kind]: "square", sideLength: 10 })
    await Util.assertions.encoding.succeed(schema, { [kind]: "square", sideLength: 10 }, { sideLength: 10 })
  })

  it("string keys unique symbols", async () => {
    const Circle = S.Struct({ radius: S.Number })
    const Square = S.Struct({ sideLength: S.Number })
    const kind = Symbol.for("effect/Schema/test/kind")
    const circle = Symbol.for("effect/Schema/test/circle")
    const square = Symbol.for("effect/Schema/test/square")
    const schema = S.Union(
      Circle.pipe(S.attachPropertySignature(kind, circle)),
      Square.pipe(S.attachPropertySignature(kind, square))
    )

    await Util.assertions.decoding.succeed(schema, { radius: 10 }, { [kind]: circle, radius: 10 })
    await Util.assertions.encoding.succeed(schema, { [kind]: circle, radius: 10 }, { radius: 10 })
    await Util.assertions.decoding.succeed(schema, { sideLength: 10 }, { [kind]: square, sideLength: 10 })
    await Util.assertions.encoding.succeed(schema, { [kind]: square, sideLength: 10 }, { sideLength: 10 })
  })

  it("symbol keys unique symbols", async () => {
    const Circle = S.Struct({ radius: S.Number })
    const Square = S.Struct({ sideLength: S.Number })
    const circle = Symbol.for("effect/Schema/test/circle")
    const square = Symbol.for("effect/Schema/test/square")
    const schema = S.Union(
      Circle.pipe(S.attachPropertySignature("kind", circle)),
      Square.pipe(S.attachPropertySignature("kind", square))
    )

    await Util.assertions.decoding.succeed(schema, { radius: 10 }, { kind: circle, radius: 10 })
    await Util.assertions.encoding.succeed(schema, { kind: circle, radius: 10 }, { radius: 10 })
    await Util.assertions.decoding.succeed(schema, { sideLength: 10 }, { kind: square, sideLength: 10 })
    await Util.assertions.encoding.succeed(schema, { kind: square, sideLength: 10 }, { sideLength: 10 })
  })

  it("should be compatible with extend", async () => {
    const schema = S.Struct({ a: S.String }).pipe(
      S.attachPropertySignature("_tag", "b"),
      S.extend(S.Struct({ c: S.Number }))
    )
    await Util.assertions.decoding.succeed(schema, { a: "a", c: 1 }, { a: "a", c: 1, _tag: "b" as const })
    await Util.assertions.encoding.succeed(schema, { a: "a", c: 1, _tag: "b" as const }, { a: "a", c: 1 })
  })

  it("with a transformation", async () => {
    const From = S.Struct({ radius: S.Number, _isVisible: S.optionalWith(S.Boolean, { exact: true }) })
    const To = S.Struct({ radius: S.Number, _isVisible: S.Boolean })

    const schema = S.transformOrFail(
      From,
      To,
      {
        strict: true,
        decode: (input) => ParseResult.mapError(S.decodeUnknown(To)(input), (e) => e.issue),
        encode: ({ _isVisible, ...rest }) => ParseResult.succeed(rest)
      }
    ).pipe(
      S.attachPropertySignature("_tag", "Circle")
    )

    await Util.assertions.decoding.succeed(schema, { radius: 10, _isVisible: true }, {
      _tag: "Circle" as const,
      _isVisible: true,
      radius: 10
    })
    await Util.assertions.encoding.succeed(schema, {
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
    await Util.assertions.encoding.fail(
      schema1,
      null as any,
      `({ readonly a: string } <-> AttachedProperty)
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
    await Util.assertions.encoding.fail(
      schema2,
      null as any,
      `({ readonly a: string } <-> AttachedProperty)
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
    await Util.assertions.decoding.fail(
      schema,
      null,
      `AttachedProperty
└─ Encoded side transformation failure
   └─ Expected { readonly a: string }, actual null`
    )
  })
})
