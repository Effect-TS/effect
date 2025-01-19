import * as E from "effect/Either"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("EitherFromUnion", () => {
  it("property tests", () => {
    Util.assertions.roundtrip(S.EitherFromUnion({ left: S.String, right: S.Number }))
  })

  it("decoding success", async () => {
    const schema = S.EitherFromUnion({ left: S.DateFromString, right: S.NumberFromString })
    await Util.expectDecodeUnknownSuccess(schema, "1970-01-01T00:00:00.000Z", E.left(new Date(0)))
    await Util.expectDecodeUnknownSuccess(schema, "1", E.right(1))

    expect(E.isEither(S.decodeSync(schema)("1970-01-01T00:00:00.000Z"))).toEqual(true)
    expect(E.isEither(S.decodeSync(schema)("1"))).toEqual(true)
  })

  it("decoding error (Encoded side transformation failure)", async () => {
    const schema = S.EitherFromUnion({ left: S.Number, right: S.String })
    await Util.expectDecodeUnknownFailure(
      schema,
      undefined,
      `((string <-> RightEncoded<string>) | (number <-> LeftEncoded<number>) <-> Either<string, number>)
└─ Encoded side transformation failure
   └─ (string <-> RightEncoded<string>) | (number <-> LeftEncoded<number>)
      ├─ (string <-> RightEncoded<string>)
      │  └─ Encoded side transformation failure
      │     └─ Expected string, actual undefined
      └─ (number <-> LeftEncoded<number>)
         └─ Encoded side transformation failure
            └─ Expected number, actual undefined`
    )
  })

  it("decoding error (Transformation process failure)", async () => {
    const schema = S.EitherFromUnion({ left: S.Number, right: S.compose(S.Boolean, S.String, { strict: false }) })
    await Util.expectDecodeUnknownFailure(
      schema,
      true,
      `(((boolean <-> string) <-> RightEncoded<string>) | (number <-> LeftEncoded<number>) <-> Either<string, number>)
└─ Encoded side transformation failure
   └─ ((boolean <-> string) <-> RightEncoded<string>) | (number <-> LeftEncoded<number>)
      ├─ ((boolean <-> string) <-> RightEncoded<string>)
      │  └─ Encoded side transformation failure
      │     └─ (boolean <-> string)
      │        └─ Type side transformation failure
      │           └─ Expected string, actual true
      └─ (number <-> LeftEncoded<number>)
         └─ Encoded side transformation failure
            └─ Expected number, actual true`
    )
  })

  it("decoding prefer right", async () => {
    const schema = S.EitherFromUnion({ left: S.NumberFromString, right: S.NumberFromString })
    await Util.expectDecodeUnknownSuccess(schema, "1", E.right(1))
  })

  it("encoding success", async () => {
    const schema = S.EitherFromUnion({ left: S.DateFromString, right: S.NumberFromString })
    await Util.expectEncodeSuccess(schema, E.left(new Date(0)), "1970-01-01T00:00:00.000Z")
    await Util.expectEncodeSuccess(schema, E.right(1), "1")
  })

  it("encoding error", async () => {
    const schema = S.EitherFromUnion({
      left: S.compose(S.DateFromString, S.Unknown, { strict: false }),
      right: S.compose(S.NumberFromString, S.Unknown, { strict: false })
    })
    await Util.expectEncodeFailure(
      schema,
      E.left(undefined),
      `(((NumberFromString <-> unknown) <-> RightEncoded<unknown>) | ((DateFromString <-> unknown) <-> LeftEncoded<unknown>) <-> Either<unknown, unknown>)
└─ Encoded side transformation failure
   └─ ((NumberFromString <-> unknown) <-> RightEncoded<unknown>) | ((DateFromString <-> unknown) <-> LeftEncoded<unknown>)
      └─ ((DateFromString <-> unknown) <-> LeftEncoded<unknown>)
         └─ Encoded side transformation failure
            └─ (DateFromString <-> unknown)
               └─ Encoded side transformation failure
                  └─ DateFromString
                     └─ Type side transformation failure
                        └─ Expected DateFromSelf, actual undefined`
    )
    await Util.expectEncodeFailure(
      schema,
      E.right(undefined),
      `(((NumberFromString <-> unknown) <-> RightEncoded<unknown>) | ((DateFromString <-> unknown) <-> LeftEncoded<unknown>) <-> Either<unknown, unknown>)
└─ Encoded side transformation failure
   └─ ((NumberFromString <-> unknown) <-> RightEncoded<unknown>) | ((DateFromString <-> unknown) <-> LeftEncoded<unknown>)
      └─ ((NumberFromString <-> unknown) <-> RightEncoded<unknown>)
         └─ Encoded side transformation failure
            └─ (NumberFromString <-> unknown)
               └─ Encoded side transformation failure
                  └─ NumberFromString
                     └─ Type side transformation failure
                        └─ Expected number, actual undefined`
    )
  })

  it("encoding don't overlap", async () => {
    const schema = S.EitherFromUnion({
      left: S.compose(S.DateFromString, S.Unknown, { strict: false }),
      right: S.compose(S.NumberFromString, S.Unknown, { strict: false })
    })
    await Util.expectEncodeFailure(
      schema,
      E.left(1),
      `(((NumberFromString <-> unknown) <-> RightEncoded<unknown>) | ((DateFromString <-> unknown) <-> LeftEncoded<unknown>) <-> Either<unknown, unknown>)
└─ Encoded side transformation failure
   └─ ((NumberFromString <-> unknown) <-> RightEncoded<unknown>) | ((DateFromString <-> unknown) <-> LeftEncoded<unknown>)
      └─ ((DateFromString <-> unknown) <-> LeftEncoded<unknown>)
         └─ Encoded side transformation failure
            └─ (DateFromString <-> unknown)
               └─ Encoded side transformation failure
                  └─ DateFromString
                     └─ Type side transformation failure
                        └─ Expected DateFromSelf, actual 1`
    )
    await Util.expectEncodeFailure(
      schema,
      E.right(new Date(0)),
      `(((NumberFromString <-> unknown) <-> RightEncoded<unknown>) | ((DateFromString <-> unknown) <-> LeftEncoded<unknown>) <-> Either<unknown, unknown>)
└─ Encoded side transformation failure
   └─ ((NumberFromString <-> unknown) <-> RightEncoded<unknown>) | ((DateFromString <-> unknown) <-> LeftEncoded<unknown>)
      └─ ((NumberFromString <-> unknown) <-> RightEncoded<unknown>)
         └─ Encoded side transformation failure
            └─ (NumberFromString <-> unknown)
               └─ Encoded side transformation failure
                  └─ NumberFromString
                     └─ Type side transformation failure
                        └─ Expected number, actual ${new Date(0).toISOString()}`
    )
  })
})
