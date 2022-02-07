import * as CK from "../../src/Collections/Immutable/Chunk/index.js"
import * as Tp from "../../src/Collections/Immutable/Tuple/index.js"
import * as T from "../../src/Effect/index.js"
import * as S from "../../src/Experimental/Stream/index.js"
import * as SK from "../../src/Experimental/Stream/Sink/index.js"
import { pipe } from "../../src/Function/index.js"
import * as O from "../../src/Option/index.js"

describe("Sink", () => {
  it("untilOutputEffect", async () => {
    const result = await pipe(
      S.range(1, 9),
      S.rechunk(2),
      S.run(
        SK.untilOutputEffect_(SK.take(4), (x) =>
          T.succeed(CK.reduce_(x, 0, (a, b) => a + b) > 10)
        )
      ),
      T.runPromise
    )

    if (O.isNone(result)) {
      fail()
    }

    expect([...result.value]).toEqual([5, 6, 7, 8])
  })

  it("zip", async () => {
    const result = await pipe(
      S.range(1, 8),
      S.run(
        pipe(
          SK.take(1),
          SK.zip(
            SK.take(1),
            SK.foldLeft(0, (acc: number, v: number) => acc - v)
          )
        )
      ),
      T.runPromise
    )

    expect(result).equals(Tp.tuple(CK.single(1), CK.single(2), -33))
  })

  it("zipPar", async () => {
    const result = await pipe(
      S.range(1, 8),
      S.run(
        pipe(
          SK.foldLeft(0, (acc: number, v: number) => acc + v),
          SK.zipPar(
            SK.foldLeft(0, (acc: number, v: number) => acc - v),
            SK.foldLeft(1, (acc: number, v: number) => acc * v)
          )
        )
      ),
      T.runPromise
    )

    expect(result).toEqual(Tp.tuple(36, -36, 40320))
  })
})
