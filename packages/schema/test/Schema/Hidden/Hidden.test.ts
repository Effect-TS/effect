import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { Hidden } from "effect"
import { describe, expect, it } from "vitest"

describe("Hidden", () => {
  const schema = S.Hidden(S.String)

  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("arbitrary", () => {
    Util.expectArbitrary(S.HiddenFromSelf(S.Number))
  })

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(
      schema,
      "keep me safe",
      Hidden.make("keep me safe")
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      Hidden.make(123),
      `(string <-> Hidden(<hidden>))
└─ Encoded side transformation failure
   └─ Expected a string, actual <hidden>`
    )
  })

  it("encoding", () => {
    Util.expectEncodeSuccess(
      schema,
      Hidden.make("keep me safe"),
      "keep me safe"
    )
  })

  it("Pretty", () => {
    const pretty = Pretty.make(schema)
    expect(pretty(Hidden.make("keep me safe"))).toEqual(`Hidden(<hidden>)`)
  })
})
