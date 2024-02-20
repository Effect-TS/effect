import * as ParseResult from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"
import { Effect, Either, Exit } from "effect"
import { inspect } from "node:util"
import { describe, expect, it } from "vitest"

describe("ParseResult", () => {
  const typeParseError1 = ParseResult.parseError(new ParseResult.Type(S.string.ast, null))
  const typeParseError2 = ParseResult.parseError(new ParseResult.Type(S.number.ast, null))

  it("toString()", () => {
    const schema = S.struct({ a: S.string })
    expect(S.decodeUnknownEither(schema)({}).pipe(Either.mapLeft((e) => e.toString()))).toStrictEqual(
      Either.left(`{ a: string }
└─ ["a"]
   └─ is missing`)
    )
  })

  it("toJSON()", () => {
    const schema = S.struct({ a: S.string })
    expect(S.decodeUnknownEither(schema)({}).pipe(Either.mapLeft((e) => (e as any).toJSON())))
      .toStrictEqual(
        Either.left({
          _id: "ParseError",
          message: `{ a: string }
└─ ["a"]
   └─ is missing`
        })
      )
  })

  it("[NodeInspectSymbol]", () => {
    const schema = S.struct({ a: S.string })
    expect(S.decodeUnknownEither(schema)({}).pipe(Either.mapLeft((e) => inspect(e))))
      .toStrictEqual(
        Either.left(inspect({
          _id: "ParseError",
          message: `{ a: string }
└─ ["a"]
   └─ is missing`
        }))
      )
  })

  it("Error.stack", () => {
    expect(
      ParseResult.parseError(new ParseResult.Type(S.string.ast, 1)).stack?.startsWith(
        `ParseError: Expected a string, actual 1`
      )
    )
      .toEqual(true)
  })

  it("Effect.catchTag can be used to catch ParseError", () => {
    const program = Effect.fail(typeParseError1).pipe(
      Effect.catchTag("ParseError", () => Effect.succeed(1))
    )
    expect(Effect.runSync(program)).toBe(1)
  })

  it("map (Either)", () => {
    expect(ParseResult.map(Either.right(1), (n) => n + 1)).toStrictEqual(Either.right(2))
    expect(ParseResult.map(Either.left(typeParseError1), (n) => n + 1)).toStrictEqual(
      Either.left(typeParseError1)
    )
    // pipeable
    expect(Either.right(1).pipe(ParseResult.map((n) => n + 1))).toStrictEqual(Either.right(2))
  })

  it("map (Effect)", () => {
    expect(Effect.runSyncExit(ParseResult.map(Effect.succeed(1), (n) => n + 1))).toStrictEqual(
      Exit.succeed(2)
    )
    expect(Effect.runSyncExit(ParseResult.map(Effect.fail(typeParseError1), (n) => n + 1)))
      .toStrictEqual(Exit.fail(typeParseError1))
  })

  it("mapLeft (Either)", () => {
    expect(ParseResult.mapError(Either.right(1), () => typeParseError2)).toStrictEqual(
      Either.right(1)
    )
    expect(ParseResult.mapError(Either.left(typeParseError1), () => typeParseError2))
      .toStrictEqual(Either.left(typeParseError2))
    // pipeable
    expect(Either.right(1).pipe(ParseResult.mapError(() => typeParseError2))).toStrictEqual(
      Either.right(1)
    )
  })

  it("mapLeft (Effect)", () => {
    expect(Effect.runSyncExit(ParseResult.mapError(Effect.succeed(1), () => typeParseError2)))
      .toStrictEqual(Exit.succeed(1))
    expect(
      Effect.runSyncExit(
        ParseResult.mapError(Effect.fail(typeParseError1), () => typeParseError2)
      )
    ).toStrictEqual(Exit.fail(typeParseError2))
  })

  it("mapBoth (Either)", () => {
    expect(ParseResult.mapBoth(Either.right(1), { onFailure: () => typeParseError2, onSuccess: (n) => n + 1 }))
      .toStrictEqual(Either.right(2))
    expect(
      ParseResult.mapBoth(Either.left(typeParseError1), {
        onFailure: () => typeParseError2,
        onSuccess: (n) => n + 1
      })
    ).toStrictEqual(Either.left(typeParseError2))
    // pipeable
    expect(Either.right(1).pipe(ParseResult.mapBoth({ onFailure: () => typeParseError2, onSuccess: (n) => n + 1 })))
      .toStrictEqual(Either.right(2))
  })

  it("mapBoth (Effect)", () => {
    expect(
      Effect.runSyncExit(
        ParseResult.mapBoth(Effect.succeed(1), { onFailure: () => typeParseError2, onSuccess: (n) => n + 1 })
      )
    ).toStrictEqual(Exit.succeed(2))
    expect(
      Effect.runSyncExit(
        ParseResult.mapBoth(Effect.fail(typeParseError1), {
          onFailure: () => typeParseError2,
          onSuccess: (n) => n + 1
        })
      )
    ).toStrictEqual(Exit.fail(typeParseError2))
  })

  it("orElse (Either)", () => {
    expect(ParseResult.orElse(Either.right(1), () => Either.right(2))).toStrictEqual(
      Either.right(1)
    )
    expect(ParseResult.orElse(Either.left(typeParseError1), () => Either.right(2)))
      .toStrictEqual(Either.right(2))
    // pipeable
    expect(Either.right(1).pipe(ParseResult.orElse(() => Either.right(2)))).toStrictEqual(
      Either.right(1)
    )
  })

  it("orElse (Effect)", () => {
    expect(Effect.runSyncExit(ParseResult.orElse(Effect.succeed(1), () => Either.right(2))))
      .toStrictEqual(
        Exit.succeed(1)
      )
    expect(
      Effect.runSyncExit(
        ParseResult.orElse(Effect.fail(typeParseError1), () => Either.right(2))
      )
    ).toStrictEqual(Exit.succeed(2))
  })
})

describe("ParseIssue.actual", () => {
  it("transform decode", () => {
    const result = S.decodeEither(S.transformOrFail(
      S.NumberFromString,
      S.boolean,
      (n, _, ast) => ParseResult.fail(new ParseResult.Type(ast, n)),
      (b, _, ast) => ParseResult.fail(new ParseResult.Type(ast, b))
    ))("1")
    if (Either.isRight(result)) throw new Error("Expected failure")
    expect(result.left.error.actual).toEqual("1")
    expect((result.left.error as ParseResult.Transform).error.actual).toEqual(1)
  })

  it("transform encode", () => {
    const result = S.encodeEither(S.transformOrFail(
      S.boolean,
      S.NumberFromString,
      (n, _, ast) => ParseResult.fail(new ParseResult.Type(ast, n)),
      (b, _, ast) => ParseResult.fail(new ParseResult.Type(ast, b))
    ))(1)
    if (Either.isRight(result)) throw new Error("Expected failure")
    expect(result.left.error.actual).toEqual(1)
    expect((result.left.error as ParseResult.Transform).error.actual).toEqual("1")
  })

  it("compose decode", () => {
    const result = S.decodeEither(S.compose(S.NumberFromString, S.negative()(S.number)))("1")
    if (Either.isRight(result)) throw new Error("Expected failure")
    expect(result.left.error.actual).toEqual("1")
    expect((result.left.error as ParseResult.Transform).error.actual).toEqual(1)
  })

  it("compose encode", () => {
    const result = S.encodeEither(S.compose(S.length(5)(S.string), S.NumberFromString))(1)
    if (Either.isRight(result)) throw new Error("Expected failure")
    expect(result.left.error.actual).toEqual(1)
    expect((result.left.error as ParseResult.Transform).error.actual).toEqual("1")
  })

  it("decode", () => {
    expect(Either.isEither(ParseResult.decode(S.string)("a")))
  })

  it("encode", () => {
    expect(Either.isEither(ParseResult.encode(S.string)("a")))
  })
})
