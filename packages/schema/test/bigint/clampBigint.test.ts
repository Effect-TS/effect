import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("bigint/clampBigInt", () => {
  it("decoding", async () => {
    const schema = S.bigintFromSelf.pipe(S.clampBigInt(-1n, 1n))

    await Util.expectDecodeUnknownSuccess(schema, 3n, 1n)
    await Util.expectDecodeUnknownSuccess(schema, 0n, 0n)
    await Util.expectDecodeUnknownSuccess(schema, -3n, -1n)
  })
})
