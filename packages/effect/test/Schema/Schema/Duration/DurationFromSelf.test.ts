import { Duration } from "effect"
import * as Pretty from "effect/Pretty"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("DurationFromSelf", () => {
  const schema = S.DurationFromSelf

  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(schema)
  })

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, Duration.nanos(123n), Duration.nanos(123n))
    await Util.assertions.decoding.succeed(schema, Duration.millis(0), Duration.millis(0))
    await Util.assertions.decoding.fail(
      schema,
      123,
      `Expected DurationFromSelf, actual 123`
    )
    await Util.assertions.decoding.fail(
      schema,
      123n,
      `Expected DurationFromSelf, actual 123n`
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(schema, Duration.seconds(5), Duration.seconds(5))
  })

  it("pretty", () => {
    const pretty = Pretty.make(schema)

    expect(pretty(Duration.millis(500))).toEqual("Duration(500ms)")
    expect(pretty(Duration.seconds(30))).toEqual("Duration(30s)")
    expect(pretty(Duration.minutes(5.25))).toEqual("Duration(5m 15s)")
  })
})
