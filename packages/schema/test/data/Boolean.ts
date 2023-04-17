import { pipe } from "@effect/data/Function"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("Boolean", () => {
  it("not", async () => {
    const schema = pipe(S.boolean, S.not)

    await Util.expectParseSuccess(schema, true, false)
    await Util.expectParseSuccess(schema, false, true)
    await Util.expectEncodeSuccess(schema, true, false)
    await Util.expectEncodeSuccess(schema, false, true)
  })
})
