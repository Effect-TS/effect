import { Redacted } from "effect"
import * as Pretty from "effect/Pretty"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("Redacted", () => {
  const schema = S.Redacted(S.String)

  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("arbitrary", () => {
    Util.assertions.arbitrary.is(S.RedactedFromSelf(S.Number))
  })

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(
      schema,
      "keep me safe",
      Redacted.make("keep me safe")
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      Redacted.make(123),
      `(string <-> Redacted(<redacted>))
└─ Encoded side transformation failure
   └─ Expected string, actual <redacted>`
    )
  })

  it("encoding", () => {
    Util.expectEncodeSuccess(
      schema,
      Redacted.make("keep me safe"),
      "keep me safe"
    )
  })

  it("Pretty", () => {
    const pretty = Pretty.make(schema)
    expect(pretty(Redacted.make("keep me safe"))).toEqual(`Redacted(<redacted>)`)
  })
})
