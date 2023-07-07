import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("dev", () => {
  it.skip("union/optional property signatures: should return the best output", async () => {
    const ab = S.struct({ a: S.string, b: S.optional(S.number) })
    const ac = S.struct({ a: S.string, c: S.optional(S.number) })
    const schema = S.union(ab, ac)
    await Util.expectParseSuccess(
      schema,
      { a: "a", c: 1 },
      { a: "a" }
    )
  })
})
