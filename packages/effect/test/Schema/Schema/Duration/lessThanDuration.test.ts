import { Duration } from "effect"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("lessThanDuration", () => {
  const schema = S.DurationFromSelf.pipe(S.lessThanDuration("5 seconds"))

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(
      schema,
      Duration.decode("4 seconds"),
      Duration.decode("4 seconds")
    )

    await Util.expectDecodeUnknownFailure(
      schema,
      Duration.decode("5 seconds"),
      `a Duration less than Duration(5s)
└─ Predicate refinement failure
   └─ Expected a Duration less than Duration(5s), actual Duration(5s)`
    )

    await Util.expectDecodeUnknownFailure(
      schema,
      Duration.decode("6 seconds"),
      `a Duration less than Duration(5s)
└─ Predicate refinement failure
   └─ Expected a Duration less than Duration(5s), actual Duration(6s)`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(
      schema,
      Duration.decode("4 seconds"),
      Duration.decode("4 seconds")
    )
  })
})
