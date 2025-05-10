import { describe, it } from "@effect/vitest"
import { Redacted } from "effect"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("RedactedFromSelf", () => {
  const schema = S.RedactedFromSelf(S.String)

  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(schema)
  })

  it("arbitrary", () => {
    Util.assertions.arbitrary.validateGeneratedValues(S.RedactedFromSelf(S.Number))
  })

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(
      schema,
      Redacted.make("keep me safe"),
      Redacted.make("keep me safe")
    )
    await Util.assertions.decoding.fail(
      schema,
      Redacted.make(123),
      `Redacted(<redacted>)
└─ Expected string, actual 123`
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(
      schema,
      Redacted.make("keep me safe"),
      Redacted.make("keep me safe")
    )
  })

  it("Pretty", () => {
    Util.assertions.pretty(schema, Redacted.make("keep me safe"), `Redacted(<redacted>)`)
  })
})
