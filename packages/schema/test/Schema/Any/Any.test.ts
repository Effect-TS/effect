import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { describe, it } from "vitest"

describe("Any", () => {
  const schema = S.Any
  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, undefined)
    await Util.expectDecodeUnknownSuccess(schema, null)
    await Util.expectDecodeUnknownSuccess(schema, "a")
    await Util.expectDecodeUnknownSuccess(schema, 1)
    await Util.expectDecodeUnknownSuccess(schema, true)
    await Util.expectDecodeUnknownSuccess(schema, [])
    await Util.expectDecodeUnknownSuccess(schema, {})
  })
})
