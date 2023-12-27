import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("number/between", () => {
  const schema = S.number.pipe(S.between(-1, 1))
  it("decoding", async () => {
    await Util.expectParseFailure(schema, -2, "Expected a number between -1 and 1, actual -2")
    await Util.expectParseSuccess(schema, 0, 0)
    await Util.expectParseFailure(schema, 2, "Expected a number between -1 and 1, actual 2")
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, 1, 1)
  })
})
