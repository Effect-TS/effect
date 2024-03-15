import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("number > clamp", () => {
  it("decoding", async () => {
    const schema = S.number.pipe(S.negate)
    await Util.expectDecodeUnknownSuccess(schema, 3, -3)
    await Util.expectDecodeUnknownSuccess(schema, 0, -0)
    await Util.expectDecodeUnknownSuccess(schema, 1, -1)
  })
})
