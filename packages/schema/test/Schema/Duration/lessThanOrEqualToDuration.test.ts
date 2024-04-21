import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { Duration } from "effect"
import { describe, it } from "vitest"

describe("lessThanOrEqualToDuration", () => {
  const schema = S.DurationFromSelf.pipe(S.lessThanOrEqualToDuration("5 seconds"))

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(
      schema,
      Duration.decode("4 seconds"),
      Duration.decode("4 seconds")
    )

    await Util.expectDecodeUnknownSuccess(
      schema,
      Duration.decode("5 seconds"),
      Duration.decode("5 seconds")
    )

    await Util.expectDecodeUnknownFailure(
      schema,
      Duration.decode("6 seconds"),
      `a Duration less than or equal to Duration(5s)
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
