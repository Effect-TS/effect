import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("BigIntFromNumber", () => {
  const schema = S.BigIntFromNumber

  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(schema)
  })

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, 0, 0n)
    await Util.assertions.decoding.succeed(schema, -0, -0n)
    await Util.assertions.decoding.succeed(schema, 1, 1n)

    await Util.assertions.decoding.fail(
      schema,
      1.2,
      `BigIntFromNumber
└─ Transformation process failure
   └─ Unable to decode 1.2 into a bigint`
    )
    await Util.assertions.decoding.fail(
      schema,
      NaN,
      `BigIntFromNumber
└─ Transformation process failure
   └─ Unable to decode NaN into a bigint`
    )
    await Util.assertions.decoding.fail(
      schema,
      Infinity,
      `BigIntFromNumber
└─ Transformation process failure
   └─ Unable to decode Infinity into a bigint`
    )
    await Util.assertions.decoding.fail(
      schema,
      -Infinity,
      `BigIntFromNumber
└─ Transformation process failure
   └─ Unable to decode -Infinity into a bigint`
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(schema, 1n, 1)

    await Util.assertions.encoding.fail(
      schema,
      BigInt(Number.MAX_SAFE_INTEGER) + 1n,
      `BigIntFromNumber
└─ Type side transformation failure
   └─ betweenBigInt(-9007199254740991, 9007199254740991)
      └─ Predicate refinement failure
         └─ Expected a bigint between -9007199254740991n and 9007199254740991n, actual 9007199254740992n`
    )
    await Util.assertions.encoding.fail(
      schema,
      BigInt(Number.MIN_SAFE_INTEGER) - 1n,
      `BigIntFromNumber
└─ Type side transformation failure
   └─ betweenBigInt(-9007199254740991, 9007199254740991)
      └─ Predicate refinement failure
         └─ Expected a bigint between -9007199254740991n and 9007199254740991n, actual -9007199254740992n`
    )
  })
})
