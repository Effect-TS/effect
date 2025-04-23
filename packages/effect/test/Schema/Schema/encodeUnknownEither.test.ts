import { describe, it } from "@effect/vitest"
import * as Either from "effect/Either"
import * as S from "effect/Schema"
import * as Util from "../TestUtils.js"

describe("encodeUnknownEither", () => {
  it("should return Left on async", async () => {
    await Util.assertions.either.fail(
      S.encodeUnknownEither(Util.AsyncString)("a").pipe(Either.mapLeft((e) => e.issue)),
      `AsyncString
└─ cannot be be resolved synchronously, this is caused by using runSync on an effect that performs async work`
    )
  })
})
