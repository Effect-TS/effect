import { Duration } from "effect"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("DurationFromMillis", () => {
  const schema = S.DurationFromMillis

  it("property tests", () => {
    Util.assertions.roundtrip(schema)
  })

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, 0, Duration.millis(0))
    await Util.expectDecodeUnknownSuccess(schema, 1000, Duration.seconds(1))
    await Util.expectDecodeUnknownSuccess(schema, 60 * 1000, Duration.minutes(1))
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, Duration.seconds(5), 5000)
    await Util.expectEncodeSuccess(schema, Duration.millis(5000), 5000)
    await Util.expectEncodeSuccess(schema, Duration.nanos(5000n), 0.005)
  })
})
