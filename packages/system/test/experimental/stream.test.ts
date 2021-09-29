import * as Chunk from "../../src/Collections/Immutable/Chunk"
import * as Tp from "../../src/Collections/Immutable/Tuple"
import * as T from "../../src/Effect"
import * as E from "../../src/Either"
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

    expect(result).equals(Chunk.many(1, 2, 3))
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
  it("forever", async () => {
    expect(
      await pipe(S.succeed(1), S.forever, S.take(10), S.runCollect, T.runPromise)
    ).equals(Chunk.many(1, 1, 1, 1, 1, 1, 1, 1, 1, 1))
  })
  it("zip", async () => {
    expect(
      await pipe(
        S.forever(S.succeed(0)),
        S.zip(S.forever(S.succeed(1))),
        S.take(2),
        S.runCollect,
        T.runPromise
      )
    ).equals(Chunk.many(Tp.tuple(0, 1), Tp.tuple(0, 1)))
  })
  it("mapEffect", async () => {
    expect(
      await pipe(
        S.fromChunk(Chunk.many(0, 1, 2)),
        S.mapEffect((n) => T.succeedWith(() => n + 1)),
        S.runCollect,
        T.runPromise
      )
    ).equals(Chunk.many(1, 2, 3))
  })

  it("interleaveWith", async () => {
    expect(
      await pipe(
        S.fromChunk(Chunk.many(0, 2, 4)),
        S.interleave(S.fromChunk(Chunk.many(1, 3, 5))),
        S.runCollect,
        T.runPromise
      )
    ).equals(Chunk.many(0, 1, 2, 3, 4, 5))
  })

  it("debounce", async () => {
    expect(
      await pipe(
        S.fromChunk(Chunk.many(0, 1, 2, 3, 4, 5)),
        S.debounce(100),
        S.runCollect,
        T.runPromise
      )
    ).equals(Chunk.single(5))
  })

  it("async", async () => {
    const stream = S.async((cb) => {
      let i = 0

      ;(function loop() {
        if (i++ < 5) {
          cb.single(i)
          setTimeout(loop, 20)
        } else {
          cb.end()
        }
      })()
    })

    expect(await pipe(stream, S.runCollect, T.runPromise)).equals(
      Chunk.many(1, 2, 3, 4, 5)
    )
  })

  it("asyncInterrupt", async () => {
    let closed = false
    const stream = S.asyncInterrupt<unknown, never, number>((cb) => {
      let i = 0

      ;(function loop() {
        if (i++ < 5) {
          cb.single(i + 1)
          setTimeout(loop, 20)
        } else {
          cb.end()
        }
      })()

      return E.left(
        T.succeedWith(() => {
          closed = true
        })
      )
    })

    await pipe(stream, S.interruptAfter(55), S.runDrain, T.runPromise)

    expect(closed).toBeTruthy()
  })

  it("mergeAllUnbounded", async () => {
    const result = await pipe(
      S.mergeAllUnbounded()(
        S.map_(S.tick(10), (_) => 1),
        S.map_(S.tick(20), (_) => 2),
        S.map_(S.tick(40), (_) => 3)
      ),
      S.take(10),
      S.runReduce(0, (a, b) => a + b),
      T.runPromise
    )

    expect(result).toEqual(17)
  })
})
