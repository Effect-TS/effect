import * as O from "@effect/data/Option"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("dev", () => {
  it("tmp", async () => {
    const schema = S.struct({
      thing: S.optional(S.struct({ id: S.number })).toOption()
    })
    await Util.expectParseSuccess(schema, { thing: { id: 123 } }, { thing: O.some({ id: 123 }) })
  })
})
