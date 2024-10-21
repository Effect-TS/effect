import { Duration } from "effect"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("Duration", () => {
  const schema = S.Duration

  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, [555, 123456789], Duration.nanos(555123456789n))
    await Util.expectDecodeUnknownFailure(
      schema,
      [-500, 0],
      `Duration
└─ Encoded side transformation failure
   └─ a tuple of seconds and nanos that will be parsed into a Duration
      └─ [0]
         └─ seconds
            └─ From side refinement failure
               └─ NonNegative
                  └─ Predicate refinement failure
                     └─ Expected NonNegative, actual -500`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      [0, -123],
      `Duration
└─ Encoded side transformation failure
   └─ a tuple of seconds and nanos that will be parsed into a Duration
      └─ [1]
         └─ nanos
            └─ From side refinement failure
               └─ NonNegative
                  └─ Predicate refinement failure
                     └─ Expected NonNegative, actual -123`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      123,
      `Duration
└─ Encoded side transformation failure
   └─ Expected a tuple of seconds and nanos that will be parsed into a Duration, actual 123`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      123n,
      `Duration
└─ Encoded side transformation failure
   └─ Expected a tuple of seconds and nanos that will be parsed into a Duration, actual 123n`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, Duration.seconds(5), [5, 0])
    await Util.expectEncodeSuccess(schema, Duration.millis(123456789), [123456, 789000000])
    await Util.expectEncodeSuccess(schema, Duration.nanos(555123456789n), [555, 123456789])
  })
})
