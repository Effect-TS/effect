import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Schema/void", () => {
  const schema = S.void
  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, undefined, undefined)
    await Util.expectDecodeUnknownFailure(schema, 1, `Expected void, actual 1`)
  })
})
