import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("number > negate", () => {
  it("decoding", async () => {
    const schema = S.Negate
    await Util.expectDecodeUnknownSuccess(schema, 3, -3)
    await Util.expectDecodeUnknownSuccess(schema, 0, -0)
    await Util.expectDecodeUnknownSuccess(schema, 1, -1)
  })
})
