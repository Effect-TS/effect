import { describe, it } from "@effect/vitest"
import { Duration } from "effect"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

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
    Util.assertions.pretty(schema, Duration.millis(500), "Duration(500ms)")
    Util.assertions.pretty(schema, Duration.seconds(30), "Duration(30s)")
    Util.assertions.pretty(schema, Duration.minutes(5.25), "Duration(5m 15s)")
  })
})
