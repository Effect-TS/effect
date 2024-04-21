import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { describe, it } from "vitest"

describe("Any", () => {
  const schema = S.Any
  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, undefined, undefined)
    await Util.expectDecodeUnknownSuccess(schema, null, null)
    await Util.expectDecodeUnknownSuccess(schema, "a", "a")
    await Util.expectDecodeUnknownSuccess(schema, 1, 1)
    await Util.expectDecodeUnknownSuccess(schema, true, true)
    await Util.expectDecodeUnknownSuccess(schema, [], [])
    await Util.expectDecodeUnknownSuccess(schema, {}, {})
  })
})
