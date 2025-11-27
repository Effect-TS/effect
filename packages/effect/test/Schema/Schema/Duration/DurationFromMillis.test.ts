import { describe, it } from "@effect/vitest"
import { Duration } from "effect"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("DurationFromMillis", () => {
  const schema = S.DurationFromMillis

  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(schema)
  })

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, Infinity, Duration.infinity)
    await Util.assertions.decoding.succeed(schema, 0, Duration.millis(0))
    await Util.assertions.decoding.succeed(schema, 1000, Duration.seconds(1))
    await Util.assertions.decoding.succeed(schema, 60 * 1000, Duration.minutes(1))
    await Util.assertions.decoding.succeed(schema, 0.1, Duration.millis(0.1))

    await Util.assertions.decoding.fail(
      schema,
      -1,
      `DurationFromMillis
└─ Encoded side transformation failure
   └─ nonNegative
      └─ Predicate refinement failure
         └─ Expected a non-negative number to be decoded into a Duration, actual -1`
    )
    await Util.assertions.decoding.fail(
      schema,
      NaN,
      `DurationFromMillis
└─ Encoded side transformation failure
   └─ nonNegative
      └─ Predicate refinement failure
         └─ Expected a non-negative number to be decoded into a Duration, actual NaN`
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(schema, Duration.infinity, Infinity)
    await Util.assertions.encoding.succeed(schema, Duration.seconds(5), 5000)
    await Util.assertions.encoding.succeed(schema, Duration.millis(5000), 5000)
    await Util.assertions.encoding.succeed(schema, Duration.millis(0.1), 0.1)
    await Util.assertions.encoding.succeed(schema, Duration.nanos(5000n), 0.005)
  })
})
