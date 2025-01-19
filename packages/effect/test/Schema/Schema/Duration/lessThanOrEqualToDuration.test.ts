import { Duration } from "effect"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("lessThanOrEqualToDuration", () => {
  const schema = S.DurationFromSelf.pipe(S.lessThanOrEqualToDuration("5 seconds"))

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(
      schema,
      Duration.decode("4 seconds"),
      Duration.decode("4 seconds")
    )

    await Util.assertions.decoding.succeed(
      schema,
      Duration.decode("5 seconds"),
      Duration.decode("5 seconds")
    )

    await Util.expectDecodeUnknownFailure(
      schema,
      Duration.decode("6 seconds"),
      `lessThanOrEqualToDuration(5 seconds)
└─ Predicate refinement failure
   └─ Expected a Duration less than or equal to Duration(5s), actual Duration(6s)`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(
      schema,
      Duration.decode("5 seconds"),
      Duration.decode("5 seconds")
    )
  })
})
