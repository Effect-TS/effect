import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("Boolean", () => {
  it("not", async () => {
    const schema = S.boolean.pipe(S.not)

    await Util.expectParseSuccess(schema, true, false)
    await Util.expectParseSuccess(schema, false, true)
    await Util.expectEncodeSuccess(schema, true, false)
    await Util.expectEncodeSuccess(schema, false, true)
  })
})
