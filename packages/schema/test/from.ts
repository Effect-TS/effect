import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("from", () => {
  it("lazy", async () => {
    interface I {
      prop: I | string
    }
    interface A {
      prop: A | number
    }
    const schema: S.Schema<I, A> = S.lazy(() =>
      S.struct({
        prop: S.union(S.NumberFromString, schema)
      })
    )
    const from = S.from(schema)
    await Util.expectParseSuccess(from, { prop: "a" })
    await Util.expectParseSuccess(from, { prop: { prop: "a" } })
  })
})
