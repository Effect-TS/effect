import { Duration } from "effect"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("DurationFromNanos", () => {
  const schema = S.DurationFromNanos

  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, 0n, Duration.nanos(0n))
    await Util.expectDecodeUnknownSuccess(schema, 1000n, Duration.nanos(1000n))
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, Duration.millis(5), 5000000n)
    await Util.expectEncodeSuccess(schema, Duration.nanos(5000n), 5000n)
  })
})
