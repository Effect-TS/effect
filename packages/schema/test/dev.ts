import { pipe } from "@effect/data/Function"
import * as O from "@effect/data/Option"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("dev", () => {
  it.skip("dev", async () => {
    const NumberFromString = S.NumberFromString
    const schema = S.optionFromNullable(NumberFromString)
    // await Util.expectEncodeSuccess(schema, O.none(), null)
    await Util.expectEncodeSuccess(schema, O.some(1), "1")
  })

  it.skip("refinement", () => {
    const schema = pipe(
      S.string,
      S.filter(() => {
        console.log("filter1")
        return true
      }),
      S.filter(() => {
        console.log("filter2")
        return true
      }),
      S.filter(() => {
        console.log("filter3")
        return true
      })
    )
    // expect(S.decode(schema)("a")).toEqual("a")
    expect(S.encode(schema)("a")).toEqual("a")
  })
})
