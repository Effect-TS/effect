import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Schema/number", () => {
  const schema = S.number
  it("decoding", async () => {
    await Util.expectParseSuccess(schema, 1, 1)
    await Util.expectParseSuccess(schema, NaN, NaN)
    await Util.expectParseSuccess(schema, Infinity, Infinity)
    await Util.expectParseSuccess(schema, -Infinity, -Infinity)
    await Util.expectParseFailure(schema, "a", `Expected number, actual "a"`)
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, 1, 1)
  })
})
