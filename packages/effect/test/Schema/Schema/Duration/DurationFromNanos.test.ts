import { describe, it } from "@effect/vitest"
import { Duration } from "effect"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("DurationFromNanos", () => {
  const schema = S.DurationFromNanos

  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(schema)
  })

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, 0n, Duration.nanos(0n))
    await Util.assertions.decoding.succeed(schema, 1000n, Duration.nanos(1000n))
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(schema, Duration.millis(5), 5000000n)
    await Util.assertions.encoding.succeed(schema, Duration.nanos(5000n), 5000n)
    await Util.assertions.encoding.fail(
      schema,
      Duration.infinity,
      `DurationFromNanos
└─ Type side transformation failure
   └─ a finite duration
      └─ Predicate refinement failure
         └─ Expected a finite duration, actual Duration(Infinity)`
    )
  })
})
