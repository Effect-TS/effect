import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("clamp", () => {
  it("decoding", async () => {
    const schema = S.Number.pipe(S.clamp(-1, 1))
    await Util.expectDecodeUnknownSuccess(schema, 3, 1)
    await Util.expectDecodeUnknownSuccess(schema, 0, 0)
    await Util.expectDecodeUnknownSuccess(schema, -3, -1)
  })

  it("should support doubles as constraints", async () => {
    const schema = S.Number.pipe(S.clamp(1.3, 3.1))
    await Util.expectDecodeUnknownSuccess(schema, 4, 3.1)
    await Util.expectDecodeUnknownSuccess(schema, 2, 2)
    await Util.expectDecodeUnknownSuccess(schema, 1, 1.3)
  })
})
