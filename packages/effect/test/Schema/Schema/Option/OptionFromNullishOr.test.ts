import { describe, it } from "@effect/vitest"
import { assertTrue } from "@effect/vitest/utils"
import * as O from "effect/Option"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("OptionFromNullishOr", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.OptionFromNullishOr(S.Number, null))
    Util.assertions.testRoundtripConsistency(S.OptionFromNullishOr(S.Number, undefined))
  })

  it("decoding", async () => {
    const schema = S.OptionFromNullishOr(S.NumberFromString, undefined)
    await Util.assertions.decoding.succeed(schema, null, O.none())
    await Util.assertions.decoding.succeed(schema, undefined, O.none())
    await Util.assertions.decoding.succeed(schema, "1", O.some(1))

    assertTrue(O.isOption(S.decodeSync(schema)(null)))
    assertTrue(O.isOption(S.decodeSync(schema)(undefined)))
    assertTrue(O.isOption(S.decodeSync(schema)("1")))

    await Util.assertions.decoding.fail(
      schema,
      {},
      `(NumberFromString | null | undefined <-> Option<number>)
└─ Encoded side transformation failure
   └─ NumberFromString | null | undefined
      ├─ NumberFromString
      │  └─ Encoded side transformation failure
      │     └─ Expected string, actual {}
      ├─ Expected null, actual {}
      └─ Expected undefined, actual {}`
    )
  })

  it("encoding null", async () => {
    const schema = S.OptionFromNullishOr(S.NumberFromString, null)
    await Util.assertions.encoding.succeed(schema, O.none(), null)
    await Util.assertions.encoding.succeed(schema, O.some(1), "1")
  })

  it("encoding undefined", async () => {
    const schema = S.OptionFromNullishOr(S.NumberFromString, undefined)
    await Util.assertions.encoding.succeed(schema, O.none(), undefined)
    await Util.assertions.encoding.succeed(schema, O.some(1), "1")
  })
})
