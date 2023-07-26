import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("compose", async () => {
  it("split string compose array of NumberFromString (dual)", async () => {
    const schema = S.compose(S.split(S.string, ","), S.array(S.NumberFromString))
    await Util.expectParseSuccess(schema, "1,2,3", [1, 2, 3])
  })

  it("struct compose struct", async () => {
    const schema = S.struct({ a: S.split(S.string, ",") }).pipe(
      S.compose(S.struct({ a: S.array(S.NumberFromString) }))
    )
    await Util.expectParseSuccess(schema, { a: "1,2,3" }, { a: [1, 2, 3] })
  })
})
