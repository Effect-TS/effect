import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { Secret } from "effect"
import { describe, expect, it } from "vitest"

describe("Schema/SecretFromSelf", () => {
  const schema = S.SecretFromSelf

  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("decoding", () => {
    Util.expectParseSuccess(
      schema,
      Secret.fromString("keep me safe"),
      Secret.fromString("keep me safe")
    )
  })

  it("encoding", () => {
    Util.expectEncodeSuccess(
      schema,
      Secret.fromString("keep me safe"),
      Secret.fromString("keep me safe")
    )
  })

  it("Pretty", () => {
    const pretty = Pretty.to(schema)
    expect(pretty(Secret.fromString("keep me safe"))).toEqual(`Secret(<redacted>)`)
  })
})
