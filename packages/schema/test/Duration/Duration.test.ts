import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { Duration } from "effect"
import { describe, it } from "vitest"

describe("Duration > Duration", () => {
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
└─ From side transformation failure
   └─ readonly [seconds, nanos]
      └─ [0]
         └─ seconds
            └─ From side refinement failure
               └─ NonNegative
                  └─ Predicate refinement failure
                     └─ Expected NonNegative (a non-negative number), actual -500`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      [0, -123],
      `Duration
└─ From side transformation failure
   └─ readonly [seconds, nanos]
      └─ [1]
         └─ nanos
            └─ From side refinement failure
               └─ NonNegative
                  └─ Predicate refinement failure
                     └─ Expected NonNegative (a non-negative number), actual -123`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      123,
      `Duration
└─ From side transformation failure
   └─ Expected readonly [seconds, nanos], actual 123`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      123n,
      `Duration
└─ From side transformation failure
   └─ Expected readonly [seconds, nanos], actual 123n`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, Duration.seconds(5), [5, 0])
    await Util.expectEncodeSuccess(schema, Duration.millis(123456789), [123456, 789000000])
    await Util.expectEncodeSuccess(schema, Duration.nanos(555123456789n), [555, 123456789])
  })
})
