import * as E from "@effect/data/Either"
import { pipe } from "@effect/data/Function"
import * as Effect from "@effect/io/Effect"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("dev", () => {
  it.skip("dev1", async () => {
    const fa = Effect.fromEither(E.right(1))
    expect(Effect.runSyncEither(fa)).toEqual(E.right(1))
  })

  it.skip("dev2", async () => {
    const schema = S.literal(1)
    expect(S.parseEither(schema)(1)).toEqual(E.right(1))
    expect(S.parseEffect(schema)(1)).toEqual(E.right(1))
    await Util.expectParseSuccess(schema, 1)
  })

  it.skip("dev3", () => {
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
