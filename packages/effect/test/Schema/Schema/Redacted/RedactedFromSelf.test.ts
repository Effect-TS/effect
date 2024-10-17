import { Redacted } from "effect"
import * as Pretty from "effect/Pretty"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("RedactedFromSelf", () => {
  const schema = S.RedactedFromSelf(S.String)

  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("arbitrary", () => {
    Util.expectArbitrary(S.RedactedFromSelf(S.Number))
  })

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(
      schema,
      Redacted.make("keep me safe"),
      Redacted.make("keep me safe")
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      Redacted.make(123),
      `Redacted(<redacted>)
└─ Expected string, actual 123`
    )
  })

  it("encoding", () => {
    Util.expectEncodeSuccess(
      schema,
      Redacted.make("keep me safe"),
      Redacted.make("keep me safe")
    )
  })

  it("Pretty", () => {
    const pretty = Pretty.make(schema)
    expect(pretty(Redacted.make("keep me safe"))).toEqual(`Redacted(<redacted>)`)
  })
})
