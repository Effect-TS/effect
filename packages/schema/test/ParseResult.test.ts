import * as ParseResult from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"
import { Effect, Either, Exit } from "effect"
import { inspect } from "node:util"
import { describe, expect, it } from "vitest"

describe("ParseResult", () => {
  const forbiddenParseError = ParseResult.parseError(ParseResult.forbidden(null))
  const typeParseError = ParseResult.parseError(ParseResult.type(S.string.ast, null))

  it("toString()", () => {
    const schema = S.struct({ a: S.string })
    expect(S.parseEither(schema)({}).pipe(Either.mapLeft((e) => e.toString()))).toStrictEqual(
      Either.left(`{ a: string }
└─ ["a"]
   └─ is missing`)
    )
  })

  it("toJSON()", () => {
    const schema = S.struct({ a: S.string })
    expect(S.parseEither(schema)({}).pipe(Either.mapLeft((e) => (e as any).toJSON())))
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
    expect(S.parseEither(schema)({}).pipe(Either.mapLeft((e) => inspect(e))))
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
    expect(ParseResult.parseError(ParseResult.forbidden(1)).stack?.startsWith("ParseError: is forbidden")).toEqual(true)
  })

  it("Effect.catchTag can be used to catch ParseError", () => {
    const program = Effect.fail(forbiddenParseError).pipe(
      Effect.catchTag("ParseError", () => Effect.succeed(1))
    )
    expect(Effect.runSync(program)).toBe(1)
  })

  it("map (Either)", () => {
    expect(ParseResult.map(Either.right(1), (n) => n + 1)).toStrictEqual(Either.right(2))
    expect(ParseResult.map(Either.left(forbiddenParseError), (n) => n + 1)).toStrictEqual(
      Either.left(forbiddenParseError)
    )
  })

  it("map (Effect)", () => {
    expect(Effect.runSyncExit(ParseResult.map(Effect.succeed(1), (n) => n + 1))).toStrictEqual(
      Exit.succeed(2)
    )
    expect(Effect.runSyncExit(ParseResult.map(Effect.fail(forbiddenParseError), (n) => n + 1)))
      .toStrictEqual(Exit.fail(forbiddenParseError))
  })

  it("mapLeft (Either)", () => {
    expect(ParseResult.mapLeft(Either.right(1), () => typeParseError)).toStrictEqual(
      Either.right(1)
    )
    expect(ParseResult.mapLeft(Either.left(forbiddenParseError), () => typeParseError))
      .toStrictEqual(Either.left(typeParseError))
  })

  it("mapLeft (Effect)", () => {
    expect(Effect.runSyncExit(ParseResult.mapLeft(Effect.succeed(1), () => typeParseError)))
      .toStrictEqual(Exit.succeed(1))
    expect(
      Effect.runSyncExit(
        ParseResult.mapLeft(Effect.fail(forbiddenParseError), () => typeParseError)
      )
    ).toStrictEqual(Exit.fail(typeParseError))
  })

  it("bimap (Either)", () => {
    expect(ParseResult.bimap(Either.right(1), () => typeParseError, (n) => n + 1)).toStrictEqual(
      Either.right(2)
    )
    expect(
      ParseResult.bimap(Either.left(forbiddenParseError), () => typeParseError, (n) => n + 1)
    ).toStrictEqual(Either.left(typeParseError))
  })

  it("bimap (Effect)", () => {
    expect(
      Effect.runSyncExit(
        ParseResult.bimap(Effect.succeed(1), () => typeParseError, (n) => n + 1)
      )
    ).toStrictEqual(Exit.succeed(2))
    expect(
      Effect.runSyncExit(
        ParseResult.bimap(Effect.fail(forbiddenParseError), () => typeParseError, (n) => n + 1)
      )
    ).toStrictEqual(Exit.fail(typeParseError))
  })

  it("orElse (Either)", () => {
    expect(ParseResult.orElse(Either.right(1), () => Either.right(2))).toStrictEqual(
      Either.right(1)
    )
    expect(ParseResult.orElse(Either.left(forbiddenParseError), () => Either.right(2)))
      .toStrictEqual(Either.right(2))
  })

  it("orElse (Effect)", () => {
    expect(Effect.runSyncExit(ParseResult.orElse(Effect.succeed(1), () => Either.right(2))))
      .toStrictEqual(
        Exit.succeed(1)
      )
    expect(
      Effect.runSyncExit(
        ParseResult.orElse(Effect.fail(forbiddenParseError), () => Either.right(2))
      )
    ).toStrictEqual(Exit.succeed(2))
  })
})

describe("ParseIssue.actual", () => {
  it("transform decode", () => {
    const result = S.decodeEither(S.transformOrFail(
      S.NumberFromString,
      S.boolean,
      (_) => ParseResult.fail(ParseResult.forbidden(_)),
      (_) => ParseResult.fail(ParseResult.forbidden(_))
    ))("1")
    if (Either.isRight(result)) throw new Error("Expected failure")
    expect(result.left.error.actual).toEqual("1")
    expect((result.left.error as ParseResult.Transform).error.actual).toEqual(1)
  })

  it("transform encode", () => {
    const result = S.encodeEither(S.transformOrFail(
      S.boolean,
      S.NumberFromString,
      (_) => ParseResult.fail(ParseResult.forbidden(_)),
      (_) => ParseResult.fail(ParseResult.forbidden(_))
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
})
