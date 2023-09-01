import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("string/length", () => {
  it("decoding", async () => {
    const schema = S.string.pipe(S.length(1))
    await Util.expectParseSuccess(schema, "a")

    await Util.expectParseFailure(
      schema,
      "",
      `Expected a character, actual ""`
    )
    await Util.expectParseFailure(
      schema,
      "aa",
      `Expected a character, actual "aa"`
    )
  })
})
