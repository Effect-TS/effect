import * as Chunk from "../../src/Collections/Immutable/Chunk"
import * as Tp from "../../src/Collections/Immutable/Tuple"
import * as T from "../../src/Effect"
import * as E from "../../src/Either"
import * as S from "../../src/Experimental/Stream"
import * as SBK from "../../src/Experimental/Stream/SortedByKey"
import { pipe } from "../../src/Function"
import * as Ord from "../../src/Ord"
import * as ST from "../../src/Structural"

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

  it("dropRight", async () => {
    const result = await pipe(
      S.fromIterable([1, 2, 3, 4, 5, 6, 7]),
      S.dropRight(2),
      S.runCollect,
      T.runPromise
    )

    expect(result).toEqual(Chunk.many(1, 2, 3, 4, 5))
  })

  it("zipAllSortedByKey", async () => {
    const a = S.from(
      Tp.tuple(1, "one"),
      Tp.tuple(2, "two"),
      Tp.tuple(3, "three"),
      Tp.tuple(4, "four"),
      Tp.tuple(5, "five")
    )
    const b = S.from(
      Tp.tuple(1, "un"),
      Tp.tuple(2, "deux"),
      // No three
      Tp.tuple(4, "quatre"),
      Tp.tuple(5, "cinq")
    )

    const result = await pipe(
      SBK.zipAllSortedByKey_(a, b, "<Unknown>", "<Inconnu>", Ord.number),
      S.runCollect,
      T.runPromise
    )

    expect(
      ST.deepEquals(
        result,
        Chunk.many(
          Tp.tuple(1, Tp.tuple("one", "un")),
          Tp.tuple(2, Tp.tuple("two", "deux")),
          Tp.tuple(3, Tp.tuple("three", "<Inconnu>")),
          Tp.tuple(4, Tp.tuple("four", "quatre")),
          Tp.tuple(5, Tp.tuple("five", "cinq"))
        )
      )
    ).toBeTruthy()
  })

  it("groupByKey", async () => {
    const result = await pipe(
      S.fromIterable(["hello", "world", "hi", "holla"]),
      S.groupByKey((a) => a[0]!),
      S.mergeGroupBy((k, s) =>
        pipe(
          s,
          S.take(2),
          S.map((_) => Tp.tuple(k, _))
        )
      ),
      S.runCollect,
      T.runPromise
    )

    expect(result).equals(
      Chunk.many(Tp.tuple("h", "hello"), Tp.tuple("h", "hi"), Tp.tuple("w", "world"))
    )
  })
})
