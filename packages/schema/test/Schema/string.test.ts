import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Schema/string", () => {
  const schema = S.string
  it("decoding", async () => {
    await Util.expectParseSuccess(schema, "a", "a")
    await Util.expectParseFailure(schema, 1, "Expected string, actual 1")
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, "a", "a")
  })
})
