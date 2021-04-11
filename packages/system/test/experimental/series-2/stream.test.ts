import * as Chunk from "../../../src/Collections/Immutable/Chunk"
import * as T from "../../../src/Effect"
import * as S from "../../../src/Experimental/Stream2"
import { pipe } from "../../../src/Function"

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
})
