import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("boolean/not", () => {
  const schema = S.Not
  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, true, false)
    await Util.expectDecodeUnknownSuccess(schema, false, true)
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, true, false)
    await Util.expectEncodeSuccess(schema, false, true)
  })
})
