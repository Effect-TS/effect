import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("BigIntFromSelf", () => {
  const schema = S.BigIntFromSelf
  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, 0n, 0n)
    await Util.assertions.decoding.succeed(schema, 1n, 1n)

    await Util.expectDecodeUnknownFailure(
      schema,
      null,
      `Expected bigint, actual null`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      1.2,
      `Expected bigint, actual 1.2`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, 1n, 1n)
  })
})
