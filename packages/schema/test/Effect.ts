import * as O from "@effect/data/Option"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("Effect", () => {
  it("Encoder", async () => {
    const NumberFromString = S.numberFromString(S.string)
    const schema = S.optionFromNullable(NumberFromString)
    // await Util.expectEncodeSuccess(schema, O.none(), null)
    await Util.expectEncodeSuccess(schema, O.some(1), "1")
  })
})
