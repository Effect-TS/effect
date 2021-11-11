import * as CK from "../../src/Collections/Immutable/Chunk"
import * as T from "../../src/Effect"
import * as S from "../../src/Experimental/Stream"
import * as PP from "../../src/Experimental/Stream/Pipeline"
import { pipe } from "../../src/Function"

describe("Pipeline", () => {
  it("should apply", async () => {
    const stream = pipe(
      S.from("1", "2", "3") as S.Stream<{ a: 10 }, Error, string>,
      PP.identity
    )

    const result = await pipe(
      stream,
      S.runCollect,
      T.provideAll({ a: 10 } as const),
      T.runPromise
    )

    expect(result).equals(CK.many("1", "2", "3"))
  })

  it("should compose", async () => {
    const myPipeline = PP.map((a: string) => parseInt(a, 10))["@@"](
      PP.mapEffect((a) =>
        a < 10
          ? (T.succeed(a + 1) as T.Effect<{ w: "lol" }, Error | Date, number>)
          : T.fail(new Error("FAIL"))
      )
    )

    const stream = pipe(
      S.from("1", "2", "3") as S.Stream<{ a: 10 }, never, string>,
      myPipeline
    )

    const result = await pipe(
      stream,
      S.runCollect,
      T.provideAll({ a: 10, w: "lol" } as const),
      T.runPromise
    )

    expect(result).equals(CK.many(2, 3, 4))
  })

  it.only("should branch after", async () => {
    const myAfter = PP.mapChunks((cin: CK.Chunk<number>) =>
      CK.map_(cin, (x) => (x * 2).toString())
    )
    const myPipeline = PP.branchAfter(3, (_chunk: CK.Chunk<number>) => myAfter)

    const stream = pipe(S.range(1, 10), myPipeline)

    const result = await pipe(stream, S.runCollect, T.runPromise)

    expect(result).equals(CK.many("8", "10", "12", "14", "16", "18", "20"))
  })
})
