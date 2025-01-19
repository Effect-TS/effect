import { Duration } from "effect"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("greaterThanDuration", () => {
  const schema = S.DurationFromSelf.pipe(S.greaterThanDuration("5 seconds"))

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(
      schema,
      Duration.decode("6 seconds"),
      Duration.decode("6 seconds")
    )

    await Util.expectDecodeUnknownFailure(
      schema,
      Duration.decode("5 seconds"),
      `greaterThanDuration(5 seconds)
└─ Predicate refinement failure
   └─ Expected a Duration greater than Duration(5s), actual Duration(5s)`
    )

    await Util.expectDecodeUnknownFailure(
      schema,
      Duration.decode("4 seconds"),
      `greaterThanDuration(5 seconds)
└─ Predicate refinement failure
   └─ Expected a Duration greater than Duration(5s), actual Duration(4s)`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(
      schema,
      Duration.decode("6 seconds"),
      Duration.decode("6 seconds")
    )
  })
})
