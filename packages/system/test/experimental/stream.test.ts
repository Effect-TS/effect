import * as Chunk from "../../src/Collections/Immutable/Chunk"
import * as T from "../../src/Effect"
import * as S from "../../src/Experimental/Stream"
import { pipe } from "../../src/Function"

describe("Stream", () => {
  it("runCollect", async () => {
    const result = await pipe(
      S.fromChunk(Chunk.many(0, 1, 2)),
      S.map((n) => n + 1),
      S.runCollect,
      T.runPromise
    )

    expect(Chunk.toArray(result)).toEqual([1, 2, 3])
  })
  it("runDrain", async () => {
    const result: number[] = []

    await pipe(
      S.fromChunk(Chunk.many(0, 1, 2)),
      S.map((n) => n + 1),
      S.map((n) => {
        result.push(n)
      }),
      S.runDrain,
      T.runPromise
    )

    expect(result).toEqual([1, 2, 3])
  })
})
