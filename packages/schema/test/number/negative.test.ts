import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("number/negative", () => {
  const schema = S.number.pipe(S.negative())
  it("decoding", async () => {
    await Util.expectParseFailure(schema, 0, "Expected a negative number, actual 0")
    await Util.expectParseFailure(schema, 1, "Expected a negative number, actual 1")
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, -1, -1)
  })
})
