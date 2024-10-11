import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("encodeUnknownEither", () => {
  it("should return Left on async", () => {
    Util.expectEitherLeft(
      S.encodeUnknownEither(Util.AsyncString)("a"),
      `AsyncString
└─ cannot be be resolved synchronously, this is caused by using runSync on an effect that performs async work`
    )
  })
})
