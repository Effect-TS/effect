import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("dev", () => {
  it.skip("dev", async () => {
    const schema = S.record(S.string, S.number)
    const b = Symbol.for("@effect/schema/test/b")
    await Util.expectParseFailure(
      schema,
      { a: 1, [b]: "b" },
      "/Symbol(@effect/schema/test/b) is unexpected",
      Util.onExcessPropertyError
    )
  })
})
