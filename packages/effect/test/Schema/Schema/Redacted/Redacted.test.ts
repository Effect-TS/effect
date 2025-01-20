import { Redacted } from "effect"
import * as Pretty from "effect/Pretty"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("Redacted", () => {
  const schema = S.Redacted(S.String)

  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(schema)
  })

  it("arbitrary", () => {
    Util.assertions.arbitrary.validateGeneratedValues(S.RedactedFromSelf(S.Number))
  })

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(
      schema,
      "keep me safe",
      Redacted.make("keep me safe")
    )
    await Util.assertions.decoding.fail(
      schema,
      Redacted.make(123),
      `(string <-> Redacted(<redacted>))
└─ Encoded side transformation failure
   └─ Expected string, actual <redacted>`
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(
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
