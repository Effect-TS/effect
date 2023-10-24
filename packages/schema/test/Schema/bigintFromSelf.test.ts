import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Schema/bigintFromSelf", () => {
  const schema = S.bigintFromSelf
  it("decoding", async () => {
    await Util.expectParseSuccess(schema, 0n, 0n)
    await Util.expectParseSuccess(schema, 1n, 1n)

    await Util.expectParseFailure(
      schema,
      null,
      "Expected bigint, actual null"
    )
    await Util.expectParseFailure(
      schema,
      1.2,
      `Expected bigint, actual 1.2`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, 1n, 1n)
  })
})
