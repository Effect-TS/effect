import { describe, it } from "@effect/vitest"
import { Duration } from "effect"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

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
   └─ DurationValue | HRTime
      ├─ Expected DurationValue, actual null
      └─ HRTime
         ├─ Expected InfiniteHRTime, actual null
         └─ Expected FiniteHRTime, actual null`
    )

    await Util.assertions.decoding.fail(
      schema,
      {},
      `Duration
└─ Encoded side transformation failure
   └─ DurationValue | HRTime
      ├─ DurationValue
      │  └─ { readonly _tag: "Millis" | "Nanos" | "Infinity" }
      │     └─ ["_tag"]
      │        └─ is missing
      └─ HRTime
         ├─ InfiniteHRTime
         │  └─ ["0"]
         │     └─ is missing
         └─ Expected FiniteHRTime, actual {}`
    )

    await Util.assertions.decoding.fail(
      schema,
      { _tag: "Millis", millis: -1 },
      `Duration
└─ Encoded side transformation failure
   └─ DurationValue | HRTime
      ├─ DurationValue
      │  └─ { readonly _tag: "Millis"; readonly millis: NonNegativeInt }
      │     └─ ["millis"]
      │        └─ NonNegativeInt
      │           └─ From side refinement failure
      │              └─ NonNegative
      │                 └─ Predicate refinement failure
      │                    └─ Expected a non-negative number, actual -1
      └─ HRTime
         ├─ InfiniteHRTime
         │  └─ ["0"]
         │     └─ is missing
         └─ Expected FiniteHRTime, actual {"_tag":"Millis","millis":-1}`
    )

    await Util.assertions.decoding.fail(
      schema,
      { _tag: "Nanos", nanos: null },
      `Duration
└─ Encoded side transformation failure
   └─ DurationValue | HRTime
      ├─ DurationValue
      │  └─ { readonly _tag: "Nanos"; readonly nanos: BigInt }
      │     └─ ["nanos"]
      │        └─ BigInt
      │           └─ Encoded side transformation failure
      │              └─ Expected string, actual null
      └─ HRTime
         ├─ InfiniteHRTime
         │  └─ ["0"]
         │     └─ is missing
         └─ Expected FiniteHRTime, actual {"_tag":"Nanos","nanos":null}`
    )
  })

  it("HRTime backward compatible encoding", async () => {
    await Util.assertions.decoding.succeed(schema, [-1, 0], Duration.infinity)
    await Util.assertions.decoding.succeed(schema, [555, 123456789], Duration.nanos(555123456789n))
    await Util.assertions.decoding.fail(
      schema,
      [-500, 0],
      `Duration
└─ Encoded side transformation failure
   └─ DurationValue | HRTime
      ├─ DurationValue
      │  └─ { readonly _tag: "Millis" | "Nanos" | "Infinity" }
      │     └─ ["_tag"]
      │        └─ is missing
      └─ HRTime
         ├─ InfiniteHRTime
         │  └─ ["0"]
         │     └─ Expected -1, actual -500
         └─ FiniteHRTime
            └─ [0]
               └─ NonNegativeInt
                  └─ From side refinement failure
                     └─ NonNegative
                        └─ Predicate refinement failure
                           └─ Expected a non-negative number, actual -500`
    )
    await Util.assertions.decoding.fail(
      schema,
      [0, -123],
      `Duration
└─ Encoded side transformation failure
   └─ DurationValue | HRTime
      ├─ DurationValue
      │  └─ { readonly _tag: "Millis" | "Nanos" | "Infinity" }
      │     └─ ["_tag"]
      │        └─ is missing
      └─ HRTime
         ├─ InfiniteHRTime
         │  └─ ["0"]
         │     └─ Expected -1, actual 0
         └─ FiniteHRTime
            └─ [1]
               └─ NonNegativeInt
                  └─ From side refinement failure
                     └─ NonNegative
                        └─ Predicate refinement failure
                           └─ Expected a non-negative number, actual -123`
    )
    await Util.assertions.decoding.fail(
      schema,
      123,
      `Duration
└─ Encoded side transformation failure
   └─ DurationValue | HRTime
      ├─ Expected DurationValue, actual 123
      └─ HRTime
         ├─ Expected InfiniteHRTime, actual 123
         └─ Expected FiniteHRTime, actual 123`
    )
    await Util.assertions.decoding.fail(
      schema,
      123n,
      `Duration
└─ Encoded side transformation failure
   └─ DurationValue | HRTime
      ├─ Expected DurationValue, actual 123n
      └─ HRTime
         ├─ Expected InfiniteHRTime, actual 123n
         └─ Expected FiniteHRTime, actual 123n`
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
