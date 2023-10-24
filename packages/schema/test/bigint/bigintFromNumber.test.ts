import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("bigint/bigintFromNumber", () => {
  const schema = S.BigintFromNumber

  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("Decoder", async () => {
    await Util.expectParseSuccess(schema, 0, 0n)
    await Util.expectParseSuccess(schema, -0, -0n)
    await Util.expectParseSuccess(schema, 1, 1n)

    await Util.expectParseFailure(schema, 1.2, `Expected number <-> bigint, actual 1.2`)
    await Util.expectParseFailure(
      schema,
      NaN,
      `Expected number <-> bigint, actual NaN`
    )
    await Util.expectParseFailure(
      schema,
      Infinity,
      `Expected number <-> bigint, actual Infinity`
    )
    await Util.expectParseFailure(
      schema,
      -Infinity,
      `Expected number <-> bigint, actual -Infinity`
    )
  })

  it("Encoder", async () => {
    await Util.expectEncodeSuccess(schema, 1n, 1)

    await Util.expectEncodeFailure(
      schema,
      BigInt(Number.MAX_SAFE_INTEGER) + 1n,
      `Expected number <-> bigint, actual 9007199254740992n`
    )
    await Util.expectEncodeFailure(
      schema,
      BigInt(Number.MIN_SAFE_INTEGER) - 1n,
      `Expected number <-> bigint, actual -9007199254740992n`
    )
  })
})
