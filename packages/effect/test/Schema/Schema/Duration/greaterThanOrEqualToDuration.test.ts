import { Duration } from "effect"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("greaterThanOrEqualToDuration", () => {
  const schema = S.DurationFromSelf.pipe(S.greaterThanOrEqualToDuration("5 seconds"))

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(
      schema,
      Duration.decode("6 seconds"),
      Duration.decode("6 seconds")
    )

    await Util.expectDecodeUnknownSuccess(
      schema,
      Duration.decode("5 seconds"),
      Duration.decode("5 seconds")
    )

    await Util.expectDecodeUnknownFailure(
      schema,
      Duration.decode("4 seconds"),
      `greaterThanOrEqualToDuration(5 seconds)
└─ Predicate refinement failure
   └─ Expected a Duration greater than or equal to Duration(5s), actual Duration(4s)`
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
