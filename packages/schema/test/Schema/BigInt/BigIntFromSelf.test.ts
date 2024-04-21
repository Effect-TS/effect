import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { describe, it } from "vitest"

describe("BigIntFromSelf", () => {
  const schema = S.BigIntFromSelf
  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, 0n, 0n)
    await Util.expectDecodeUnknownSuccess(schema, 1n, 1n)

    await Util.expectDecodeUnknownFailure(
      schema,
      null,
      `Expected a bigint, actual null`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      1.2,
      `Expected a bigint, actual 1.2`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, 1n, 1n)
  })
})
