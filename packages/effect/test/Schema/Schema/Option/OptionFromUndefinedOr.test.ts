import { describe, it } from "@effect/vitest"
import { assertTrue } from "@effect/vitest/utils"
import * as O from "effect/Option"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("OptionFromUndefinedOr", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.OptionFromUndefinedOr(S.Number))
  })

  it("decoding", async () => {
    const schema = S.OptionFromUndefinedOr(S.NumberFromString)
    await Util.assertions.decoding.succeed(schema, undefined, O.none())
    await Util.assertions.decoding.succeed(schema, "1", O.some(1))

    assertTrue(O.isOption(S.decodeSync(schema)(undefined)))
    assertTrue(O.isOption(S.decodeSync(schema)("1")))

    await Util.assertions.decoding.fail(
      schema,
      null,
      `(NumberFromString | undefined <-> Option<number>)
└─ Encoded side transformation failure
   └─ NumberFromString | undefined
      ├─ NumberFromString
      │  └─ Encoded side transformation failure
      │     └─ Expected string, actual null
      └─ Expected undefined, actual null`
    )
    await Util.assertions.decoding.fail(
      schema,
      {},
      `(NumberFromString | undefined <-> Option<number>)
└─ Encoded side transformation failure
   └─ NumberFromString | undefined
      ├─ NumberFromString
      │  └─ Encoded side transformation failure
      │     └─ Expected string, actual {}
      └─ Expected undefined, actual {}`
    )
  })

  it("encoding", async () => {
    const schema = S.OptionFromUndefinedOr(S.NumberFromString)
    await Util.assertions.encoding.succeed(schema, O.none(), undefined)
    await Util.assertions.encoding.succeed(schema, O.some(1), "1")
  })
})
