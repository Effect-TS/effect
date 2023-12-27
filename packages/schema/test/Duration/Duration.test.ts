import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { Duration } from "effect"
import { describe, it } from "vitest"

describe("Duration", () => {
  const schema = S.Duration

  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("decoding", async () => {
    await Util.expectParseSuccess(schema, [555, 123456789], Duration.nanos(555123456789n))
    await Util.expectParseFailure(
      schema,
      [-500, 0],
      `Tuple or array: a high resolution time ([seconds: number, nanos: number])
└─ [0]
   └─ Expected seconds, actual -500`
    )
    await Util.expectParseFailure(
      schema,
      [0, -123],
      `Tuple or array: a high resolution time ([seconds: number, nanos: number])
└─ [1]
   └─ Expected nanos, actual -123`
    )
    await Util.expectParseFailure(
      schema,
      123,
      "Expected a high resolution time ([seconds: number, nanos: number]), actual 123"
    )
    await Util.expectParseFailure(
      schema,
      123n,
      "Expected a high resolution time ([seconds: number, nanos: number]), actual 123n"
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, Duration.seconds(5), [5, 0])
    await Util.expectEncodeSuccess(schema, Duration.millis(123456789), [123456, 789000000])
    await Util.expectEncodeSuccess(schema, Duration.nanos(555123456789n), [555, 123456789])
  })
})
