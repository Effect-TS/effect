import * as E from "@effect/data/Either"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("attachPropertySignature", () => {
  it("baseline", () => {
    const Circle = S.struct({ radius: S.number })
    const Square = S.struct({ sideLength: S.number })
    const DiscriminatedShape = S.union(
      Circle.pipe(S.attachPropertySignature("kind", "circle")),
      Square.pipe(S.attachPropertySignature("kind", "square"))
    )

    expect(S.decodeSync(DiscriminatedShape)({ radius: 10 })).toEqual({
      kind: "circle",
      radius: 10
    })
    expect(
      S.encodeSync(DiscriminatedShape)({
        kind: "circle",
        radius: 10
      })
    ).toEqual({ radius: 10 })
    expect(S.decodeSync(DiscriminatedShape)({ sideLength: 10 })).toEqual({
      kind: "square",
      sideLength: 10
    })
    expect(
      S.encodeSync(DiscriminatedShape)({
        kind: "square",
        sideLength: 10
      })
    ).toEqual({ sideLength: 10 })
  })

  it("should be compatible with extend", async () => {
    const schema = S.struct({ a: S.string }).pipe(
      S.attachPropertySignature("_tag", "b"),
      S.extend(S.struct({ c: S.number }))
    )
    await Util.expectParseSuccess(schema, { a: "a", c: 1 }, { a: "a", c: 1, _tag: "b" as const })
    await Util.expectEncodeSuccess(schema, { a: "a", c: 1, _tag: "b" as const }, { a: "a", c: 1 })
  })

  it("with a transformation", () => {
    const From = S.struct({ radius: S.number, _isVisible: S.optional(S.boolean) })
    const To = S.struct({ radius: S.number, _isVisible: S.boolean })

    const Circle = S.transformResult(
      From,
      To,
      S.parseEither(To),
      ({ _isVisible, ...rest }) => E.right(rest)
    ).pipe(
      S.attachPropertySignature("_tag", "Circle")
    )
    expect(S.decodeSync(Circle)({ radius: 10, _isVisible: true })).toEqual({
      _tag: "Circle",
      _isVisible: true,
      radius: 10
    })
    expect(S.encodeSync(Circle)({ _tag: "Circle", radius: 10, _isVisible: true })).toEqual({
      radius: 10
    })
  })
})
