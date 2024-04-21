import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { describe, it } from "vitest"

describe("clampBigInt", () => {
  it("decoding", async () => {
    const schema = S.BigIntFromSelf.pipe(S.clampBigInt(-1n, 1n))

    await Util.expectDecodeUnknownSuccess(schema, 3n, 1n)
    await Util.expectDecodeUnknownSuccess(schema, 0n, 0n)
    await Util.expectDecodeUnknownSuccess(schema, -3n, -1n)
  })
})
