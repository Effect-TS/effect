import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("Schema/void", () => {
  const schema = S.void
  it("decoding", async () => {
    await Util.expectParseSuccess(schema, undefined, undefined)
    await Util.expectParseFailure(schema, 1, `Expected void, actual 1`)
  })
})
