import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { Duration } from "effect"
import { describe, expect, it } from "vitest"

describe("Schema/DurationFromSelf", () => {
  const schema = S.DurationFromSelf

  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("decoding", async () => {
    await Util.expectParseSuccess(schema, Duration.nanos(123n), Duration.nanos(123n))
    await Util.expectParseSuccess(schema, Duration.millis(0), Duration.millis(0))
    await Util.expectParseFailure(schema, 123, "Expected Duration, actual 123")
    await Util.expectParseFailure(schema, 123n, "Expected Duration, actual 123n")
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, Duration.seconds(5), Duration.seconds(5))
  })

  it("pretty", () => {
    const pretty = Pretty.to(schema)

    expect(pretty(Duration.millis(500))).toEqual("Duration(500ms)")
    expect(pretty(Duration.seconds(30))).toEqual("Duration(30s)")
    expect(pretty(Duration.minutes(5.25))).toEqual("Duration(5m 15s)")
  })
})
