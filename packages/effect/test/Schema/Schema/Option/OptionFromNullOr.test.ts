import { describe, it } from "@effect/vitest"
import { assertTrue } from "@effect/vitest/utils"
import * as O from "effect/Option"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("OptionFromNullOr", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.OptionFromNullOr(S.Number))
  })

  it("decoding", async () => {
    const schema = S.OptionFromNullOr(S.NumberFromString)
    await Util.assertions.decoding.succeed(schema, null, O.none())
    await Util.assertions.decoding.succeed(schema, "1", O.some(1))

    assertTrue(O.isOption(S.decodeSync(schema)(null)))
    assertTrue(O.isOption(S.decodeSync(schema)("1")))

    await Util.assertions.decoding.fail(
      schema,
      undefined,
      `(NumberFromString | null <-> Option<number>)
└─ Encoded side transformation failure
   └─ NumberFromString | null
      ├─ NumberFromString
      │  └─ Encoded side transformation failure
      │     └─ Expected string, actual undefined
      └─ Expected null, actual undefined`
    )
    await Util.assertions.decoding.fail(
      schema,
      {},
      `(NumberFromString | null <-> Option<number>)
└─ Encoded side transformation failure
   └─ NumberFromString | null
      ├─ NumberFromString
      │  └─ Encoded side transformation failure
      │     └─ Expected string, actual {}
      └─ Expected null, actual {}`
    )
  })

  it("encoding", async () => {
    const schema = S.OptionFromNullOr(S.NumberFromString)
    await Util.assertions.encoding.succeed(schema, O.none(), null)
    await Util.assertions.encoding.succeed(schema, O.some(1), "1")
  })
})
