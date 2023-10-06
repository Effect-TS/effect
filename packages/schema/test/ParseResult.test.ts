import * as ParseResult from "@effect/schema/ParseResult"
import { Effect, Either, Exit } from "effect"

describe("ParseResult", () => {
  const forbiddenParseError = ParseResult.parseError([ParseResult.forbidden])
  const missingParseError = ParseResult.parseError([ParseResult.missing])

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
    expect(ParseResult.mapLeft(Either.right(1), () => missingParseError)).toStrictEqual(
      Either.right(1)
    )
    expect(ParseResult.mapLeft(Either.left(forbiddenParseError), () => missingParseError))
      .toStrictEqual(Either.left(missingParseError))
  })

  it("mapLeft (Effect)", () => {
    expect(Effect.runSyncExit(ParseResult.mapLeft(Effect.succeed(1), () => missingParseError)))
      .toStrictEqual(Exit.succeed(1))
    expect(
      Effect.runSyncExit(
        ParseResult.mapLeft(Effect.fail(forbiddenParseError), () => missingParseError)
      )
    ).toStrictEqual(Exit.fail(missingParseError))
  })

  it("bimap (Either)", () => {
    expect(ParseResult.bimap(Either.right(1), () => missingParseError, (n) => n + 1)).toStrictEqual(
      Either.right(2)
    )
    expect(
      ParseResult.bimap(Either.left(forbiddenParseError), () => missingParseError, (n) => n + 1)
    ).toStrictEqual(Either.left(missingParseError))
  })

  it("bimap (Effect)", () => {
    expect(
      Effect.runSyncExit(
        ParseResult.bimap(Effect.succeed(1), () => missingParseError, (n) => n + 1)
      )
    ).toStrictEqual(Exit.succeed(2))
    expect(
      Effect.runSyncExit(
        ParseResult.bimap(Effect.fail(forbiddenParseError), () => missingParseError, (n) => n + 1)
      )
    ).toStrictEqual(Exit.fail(missingParseError))
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
