import { Duration } from "effect"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("Duration", () => {
  const schema = S.Duration

  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(schema)
  })

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, { _tag: "Infinity" }, Duration.infinity)
    await Util.assertions.decoding.succeed(schema, { _tag: "Millis", millis: 12345 }, Duration.millis(12345))
    await Util.assertions.decoding.succeed(schema, { _tag: "Nanos", nanos: "54321" }, Duration.nanos(54321n))

    await Util.assertions.decoding.fail(
      schema,
      null,
      `Duration
└─ Encoded side transformation failure
   └─ Expected DurationValue, actual null`
    )

    await Util.assertions.decoding.fail(
      schema,
      {},
      `Duration
└─ Encoded side transformation failure
   └─ DurationValue
      └─ { readonly _tag: "Millis" | "Nanos" | "Infinity" }
         └─ ["_tag"]
            └─ is missing`
    )

    await Util.assertions.decoding.fail(
      schema,
      { _tag: "Millis", millis: -1 },
      `Duration
└─ Encoded side transformation failure
   └─ DurationValue
      └─ { readonly _tag: "Millis"; readonly millis: NonNegativeInt }
         └─ ["millis"]
            └─ NonNegativeInt
               └─ From side refinement failure
                  └─ NonNegative
                     └─ Predicate refinement failure
                        └─ Expected a non-negative number, actual -1`
    )

    await Util.assertions.decoding.fail(
      schema,
      { _tag: "Nanos", nanos: null },
      `Duration
└─ Encoded side transformation failure
   └─ DurationValue
      └─ { readonly _tag: "Nanos"; readonly nanos: BigInt }
         └─ ["nanos"]
            └─ BigInt
               └─ Encoded side transformation failure
                  └─ Expected string, actual null`
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(schema, Duration.infinity, { _tag: "Infinity" })
    await Util.assertions.encoding.succeed(schema, Duration.seconds(5), { _tag: "Millis", millis: 5000 })
    await Util.assertions.encoding.succeed(schema, Duration.millis(123456789), { _tag: "Millis", millis: 123456789 })
    await Util.assertions.encoding.succeed(schema, Duration.nanos(555123456789n), {
      _tag: "Nanos",
      nanos: "555123456789"
    })
  })
})
