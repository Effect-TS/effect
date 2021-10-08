import * as Chunk from "../../src/Collections/Immutable/Chunk"
import * as T from "../../src/Effect"
import * as S from "../../src/Experimental/Stream"
import * as SK from "../../src/Experimental/Stream/Sink"
import { pipe } from "../../src/Function"
import * as O from "../../src/Option"

describe("Sink", () => {
  it("untilOutputEffect", async () => {
    const result = await pipe(
      S.range(1, 8),
      S.chunkN(2),
      S.run(
        SK.untilOutputEffect_(SK.take(4), (x) =>
          T.succeed(Chunk.reduce_(x, 0, (a, b) => a + b) > 10)
        )
      ),
      T.runPromise
    )

    if (O.isNone(result)) {
      fail()
    }

    expect([...result.value]).toEqual([5, 6, 7, 8])
  })
})
