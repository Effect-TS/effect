import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { Secret } from "effect"
import { describe, it } from "vitest"

describe("Schema/Secret", () => {
  const schema = S.Secret

  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("decoding", () => {
    Util.expectParseSuccess(schema, "keep me safe", Secret.fromString("keep me safe"))
  })

  it("encoding", () => {
    Util.expectEncodeSuccess(
      schema,
      Secret.fromString("keep me safe"),
      "keep me safe"
    )
  })
})
