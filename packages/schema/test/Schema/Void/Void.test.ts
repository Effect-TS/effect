import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { describe, it } from "vitest"

describe("void", () => {
  const schema = S.Void
  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, undefined, undefined)
    await Util.expectDecodeUnknownFailure(schema, 1, `Expected void, actual 1`)
  })
})
