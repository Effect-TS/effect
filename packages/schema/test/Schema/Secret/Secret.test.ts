import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { Secret } from "effect"
import { describe, it } from "vitest"

describe("Secret", () => {
  const schema = S.Secret

  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("decoding", () => {
    Util.expectDecodeUnknownSuccess(schema, "keep me safe", Secret.fromString("keep me safe"))
  })

  it("encoding", () => {
    Util.expectEncodeSuccess(
      schema,
      Secret.fromString("keep me safe"),
      "keep me safe"
    )
  })
})
