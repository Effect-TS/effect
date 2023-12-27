import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("number/positive", () => {
  const schema = S.number.pipe(S.positive())
  it("decoding", async () => {
    await Util.expectParseFailure(schema, -1, "Expected a positive number, actual -1")
    await Util.expectParseFailure(schema, 0, "Expected a positive number, actual 0")
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, 1, 1)
  })
})
