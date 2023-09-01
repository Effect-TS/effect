import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("number/clamp", () => {
  const schema = S.number.pipe(S.clamp(-1, 1))
  it("decoding", async () => {
    await Util.expectParseSuccess(schema, 3, 1)
    await Util.expectParseSuccess(schema, 0, 0)
    await Util.expectParseSuccess(schema, -3, -1)
  })
})
