import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("number/nonPositive", () => {
  const schema = S.number.pipe(S.nonPositive())
  it("decoding", async () => {
    await Util.expectParseSuccess(schema, 0, 0)
    await Util.expectParseFailure(schema, 1, "Expected a non-positive number, actual 1")
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, -1, -1)
  })
})
