import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Schema/object", () => {
  const schema = S.object
  it("decoding", async () => {
    await Util.expectParseSuccess(schema, {})
    await Util.expectParseSuccess(schema, [])
    await Util.expectParseFailure(schema, null, `Expected object, actual null`)
    await Util.expectParseFailure(schema, "a", `Expected object, actual "a"`)
    await Util.expectParseFailure(schema, 1, `Expected object, actual 1`)
    await Util.expectParseFailure(schema, true, `Expected object, actual true`)
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, {}, {})
    await Util.expectEncodeSuccess(schema, [], [])
    await Util.expectEncodeSuccess(schema, [1, 2, 3], [1, 2, 3])
  })
})
