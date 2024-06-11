import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { Duration } from "effect"
import { describe, it } from "vitest"

describe("betweenDuration", () => {
  const schema = S.DurationFromSelf.pipe(
    S.betweenDuration("5 seconds", "10 seconds")
  ).annotations({ title: "[5 seconds, 10 seconds] interval" })

  it("decoding", async () => {
    await Util.expectDecodeUnknownFailure(
      schema,
      Duration.decode("4 seconds"),
      `[5 seconds, 10 seconds] interval
└─ Predicate refinement failure
   └─ Expected [5 seconds, 10 seconds] interval, actual Duration(4s)`
    )

    await Util.expectDecodeUnknownSuccess(
      schema,
      Duration.decode("7 seconds"),
      Duration.decode("7 seconds")
    )

    await Util.expectDecodeUnknownFailure(
      schema,
      Duration.decode("11 seconds"),
      `[5 seconds, 10 seconds] interval
└─ Predicate refinement failure
   └─ Expected [5 seconds, 10 seconds] interval, actual Duration(11s)`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(
      schema,
      Duration.decode("7 seconds"),
      Duration.decode("7 seconds")
    )
  })
})
