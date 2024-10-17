import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("Void", () => {
  const schema = S.Void
  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, undefined as any)
    await Util.expectDecodeUnknownSuccess(schema, null as any)
    await Util.expectDecodeUnknownSuccess(schema, "a" as any)
    await Util.expectDecodeUnknownSuccess(schema, 1 as any)
    await Util.expectDecodeUnknownSuccess(schema, true as any)
    await Util.expectDecodeUnknownSuccess(schema, [] as any)
    await Util.expectDecodeUnknownSuccess(schema, {} as any)
  })
})
