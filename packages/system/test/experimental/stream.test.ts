import * as Chunk from "../../src/Collections/Immutable/Chunk/index.js"
import * as Tp from "../../src/Collections/Immutable/Tuple/index.js"
import * as T from "../../src/Effect/index.js"
import * as E from "../../src/Either/index.js"
import * as S from "../../src/Experimental/Stream/index.js"
import * as SK from "../../src/Experimental/Stream/Sink/index.js"
import * as SBK from "../../src/Experimental/Stream/SortedByKey/index.js"
import { flow, pipe } from "../../src/Function/index.js"
import * as M from "../../src/Managed/index.js"
import * as O from "../../src/Option/index.js"
import * as Ord from "../../src/Ord/index.js"
import * as Ref from "../../src/Ref/index.js"
import * as SC from "../../src/Schedule/index.js"
import * as ST from "../../src/Structural/index.js"

describe("Stream", () => {
  describe("Broadcast", () => {
    it("should broadcast", async () => {
      const fn = jest.fn()

      const stream = pipe(
        Ref.makeRef(0),
        T.map((ref) =>
          S.repeatEffect(T.delay(100)(Ref.updateAndGet_(ref, (n) => n + 1)))
        ),
        S.unwrap,
        S.take(2)
      )

      const copies = await pipe(
        stream,
        S.broadcast(2, 10),
        M.use(
          T.forEachPar(
            flow(
              S.chain((n) =>
                S.fromEffect(
                  T.succeedWith(() => {
                    fn(`n: ${n}`)
                  })
                )
              ),
              S.runDrain
            )
          )
        ),
        T.runPromiseExit
      )

      expect(copies._tag).toEqual("Success")
      expect(fn.mock.calls).toEqual([["n: 1"], ["n: 1"], ["n: 2"], ["n: 2"]])
    })
  })

  describe("Core", () => {
    it("fromArray", async () => {
      const a = S.fromChunk(Chunk.make(0, 1, 2))

      expect(await T.runPromise(S.runCollect(a))).toEqual(Chunk.make(0, 1, 2))
    })
  })

  it("interleave", async () => {
    expect(
      await pipe(
        S.fromChunk(Chunk.make(1, 1, 1, 1, 1, 1, 1, 1, 1, 1)),
        S.interleave(S.fromChunk(Chunk.make(2, 2, 2, 2, 2, 2, 2, 2, 2, 2))),
        S.take(5),
        S.runCollect,
        T.runPromise
      )
    ).equals(Chunk.make(1, 2, 1, 2, 1))
  })

  it("intersperse", async () => {
    expect(
      await pipe(
        S.fromChunk(Chunk.make(1, 1, 1, 1, 1, 1, 1, 1, 1, 1)),
        S.intersperse(2),
        S.take(5),
        S.runCollect,
        T.runPromise
      )
    ).equals(Chunk.make(1, 2, 1, 2, 1))
  })

  it("runCollect", async () => {
    const result = await pipe(
      S.fromChunk(Chunk.make(0, 1, 2)),
      S.map((n) => n + 1),
      S.runCollect,
      T.runPromise
    )

    expect(result).equals(Chunk.make(1, 2, 3))
  })
  it("runDrain", async () => {
    const result: number[] = []

    await pipe(
      S.fromChunk(Chunk.make(0, 1, 2)),
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
    ).equals(Chunk.make(1, 1, 1, 1, 1, 1, 1, 1, 1, 1))
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
    ).equals(Chunk.make(Tp.tuple(0, 1), Tp.tuple(0, 1)))
  })
  it("mapEffect", async () => {
    expect(
      await pipe(
        S.fromChunk(Chunk.make(0, 1, 2)),
        S.mapEffect((n) => T.succeedWith(() => n + 1)),
        S.runCollect,
        T.runPromise
      )
    ).equals(Chunk.make(1, 2, 3))
  })

  it("interleaveWith", async () => {
    expect(
      await pipe(
        S.fromChunk(Chunk.make(0, 2, 4)),
        S.interleave(S.fromChunk(Chunk.make(1, 3, 5))),
        S.runCollect,
        T.runPromise
      )
    ).equals(Chunk.make(0, 1, 2, 3, 4, 5))
  })

  it("debounce", async () => {
    expect(
      await pipe(
        S.fromChunk(Chunk.make(0, 1, 2, 3, 4, 5)),
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
      Chunk.make(1, 2, 3, 4, 5)
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

    expect(result).toEqual(Chunk.make(1, 2, 3, 4, 5))
  })

  it("zipAllSortedByKey", async () => {
    const a = S.make(
      Tp.tuple(1, "one"),
      Tp.tuple(2, "two"),
      Tp.tuple(3, "three"),
      Tp.tuple(4, "four"),
      Tp.tuple(5, "five")
    )
    const b = S.make(
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
        Chunk.make(
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
      Chunk.make(Tp.tuple("h", "hello"), Tp.tuple("h", "hi"), Tp.tuple("w", "world"))
    )
  })

  it("merge", async () => {
    let n = 0
    const streamA = S.repeatEffectOption(
      T.delay(100)(
        T.suspend(() => {
          n++
          if (n > 3) {
            return T.fail(O.none)
          } else {
            return T.succeed(1)
          }
        })
      )
    )
    let n2 = 0
    const streamB = S.repeatEffectOption(
      T.delay(200)(
        T.suspend(() => {
          n2++
          if (n2 > 2) {
            return T.fail(O.none)
          } else {
            return T.succeed(2)
          }
        })
      )
    )

    expect(await pipe(streamA, S.merge(streamB), S.runCollect, T.runPromise)).equals(
      Chunk.make(1, 2, 1, 1, 2)
    )
  })

  it("range", async () => {
    expect(await pipe(S.range(2, 8), S.runCollect, T.runPromise)).equals(
      Chunk.make(2, 3, 4, 5, 6, 7, 8)
    )
  })

  it("sums", async () => {
    expect(
      await pipe(S.fromIterable([1, 2, 3]), S.run(SK.sum()), T.runPromise)
    ).toEqual(6)
  })

  it("chainParSwitch", async () => {
    expect(
      await pipe(
        S.fromIterable([1, 2, 3]),
        S.chainParSwitch(
          (n) => S.fromChunk<number>(Chunk.from([n, n ** 2, n ** 3])),
          10
        ),
        S.runCollect,
        T.runPromise
      )
    ).equals(Chunk.make(1, 1, 1, 2, 4, 8, 3, 9, 27))
  })

  it("debounces", async () => {
    const result = await pipe(
      S.fromIterable([1, 2, 3]),
      S.fixed(5),
      S.debounce(20),
      S.runCollect,
      T.runPromise
    )

    expect(result).equals(Chunk.single(3))
  })

  it("zipWithLatest & interruptWhen", async () => {
    const neverendingSource = S.async<unknown, unknown, string>((cb) => {
      setTimeout(() => cb.single("C1"), 10)
      setTimeout(() => cb.single("C2"), 20)
      setTimeout(() => cb.end(), 25)
    })
    const neverendingZipped = pipe(
      neverendingSource,
      S.zipWithLatest(neverendingSource, (c, e) => `${c}-${e}`)
    )

    const source = S.async<unknown, unknown, string>((cb) => {
      setTimeout(() => cb.single("C1"), 10)
      setTimeout(() => cb.single("C2"), 20)
      setTimeout(() => cb.end(), 25)
    })

    const zipped = pipe(
      source,
      S.zipWithLatest(source, (c, e) => `${c}-${e}`)
    )

    const res0 = await pipe(
      neverendingZipped,
      S.interruptWhen(T.sleep(1_000)),
      S.runCollect,
      T.runPromise
    )

    const res1 = await pipe(zipped, S.runCollect, T.runPromise)

    expect(res0).toEqual(res1)
  })

  it("zipWithLatest & Debounce", async () => {
    const withDebounce = await pipe(
      S.zipWithLatest_(
        S.async((cb) => {
          setTimeout(() => cb.single("a"))
          setTimeout(() => cb.single("b"), 100)
          setTimeout(() => cb.end(), 120)
        }),
        S.async((cb) => {
          setTimeout(() => cb.single(1))
          setTimeout(() => cb.single(2), 50)
          setTimeout(() => cb.single(3), 150)
          setTimeout(() => cb.end(), 155)
        }),
        (a, b) => [a, b] as const
      ),
      S.debounce(10),
      S.runCollect,
      T.runPromise
    )

    const withoutDebounce = await pipe(
      S.zipWithLatest_(
        S.async((cb) => {
          setTimeout(() => cb.single("a"))
          setTimeout(() => cb.single("b"), 100)
          setTimeout(() => cb.end(), 120)
        }),
        S.async((cb) => {
          setTimeout(() => cb.single(1))
          setTimeout(() => cb.single(2), 50)
          setTimeout(() => cb.single(3), 150)
          setTimeout(() => cb.end(), 155)
        }),
        (a, b) => [a, b] as const
      ),
      S.runCollect,
      T.runPromise
    )

    expect(withDebounce).toEqual(withoutDebounce)
  })

  it("retries", async () => {
    let counter = 0

    expect(
      (
        await pipe(
          S.fromIterable([1]),
          S.chain(() => {
            counter += 1
            return S.fail(new Error(""))
          }),
          S.retry(SC.recurs(3)),
          S.runDrain,
          T.runPromiseExit
        )
      )._tag
    ).toEqual("Failure")

    expect(counter).toEqual(4)
  })

  it("splitLines", async () => {
    const result = await pipe(
      S.make("Hello\nthis\nis\r\na\r\ntest\n"),
      S.splitLines,
      S.runCollect,
      T.runPromise
    )

    expect(result).equals(Chunk.make("Hello", "this", "is", "a", "test"))
  })

  it("zip", async () => {
    const result = await pipe(
      S.make(1, 2, 3),
      S.zip(S.make("a", "b", "c"), S.make(true, false, true), S.make("x", "y", "z")),
      S.runCollect,
      T.runPromise
    )

    expect(result).equals(
      Chunk.make(
        Tp.tuple(1, "a", true, "x"),
        Tp.tuple(2, "b", false, "y"),
        Tp.tuple(3, "c", true, "z")
      )
    )
  })

  it("cross", async () => {
    const result = await pipe(
      S.make(1, 2),
      S.cross(S.make("a", "b"), S.make(true, false)),
      S.runCollect,
      T.runPromise
    )

    expect(result).equals(
      Chunk.make(
        Tp.tuple(1, "a", true),
        Tp.tuple(1, "a", false),
        Tp.tuple(1, "b", true),
        Tp.tuple(1, "b", false),
        Tp.tuple(2, "a", true),
        Tp.tuple(2, "a", false),
        Tp.tuple(2, "b", true),
        Tp.tuple(2, "b", false)
      )
    )
  })

  it("splitOn", async () => {
    const result = await pipe(
      S.make("This|is|a|test"),
      S.splitOn("|"),
      S.runCollect,
      T.runPromise
    )

    expect(result).equals(Chunk.make("This", "is", "a", "test"))
  })

  it("schedule", async () => {
    const result = await pipe(
      S.range(1, 9),
      S.buffer(1),
      S.schedule(SC.fixed(100)),
      S.tap((n) =>
        T.succeedWith(() => {
          console.log(Date.now(), n)
        })
      ),
      S.runCollect,
      T.runPromise
    )

    expect(result).equals(Chunk.range(1, 9))
  })

  it("sliding", async () => {
    const result = await pipe(S.range(1, 4), S.sliding(2), S.runCollect, T.runPromise)

    expect(result).equals(
      Chunk.make(Chunk.make(1, 2), Chunk.make(2, 3), Chunk.make(3, 4))
    )
  })

  it("broadcastDynamic", async () => {
    const result = await pipe(
      M.gen(function* (_) {
        const broadcaster = yield* _(
          pipe(
            S.async<unknown, never, number>((cb) => {
              setTimeout(() => cb.single(1), 50)
              setTimeout(() => cb.single(2), 100)
              setTimeout(() => cb.single(3), 150)
              setTimeout(() => cb.end(), 200)
            }),
            S.broadcastDynamic(25)
          )
        )

        const subscriptionA = pipe(broadcaster, S.runCollect)

        const subscriptionB = pipe(broadcaster, S.runCollect)

        return yield* _(T.zipPar_(subscriptionA, subscriptionB))
      }),
      M.use(T.succeed),
      T.runPromise
    )

    expect(result).equals(Tp.tuple(Chunk.make(1, 2, 3), Chunk.make(1, 2, 3)))
  })

  // Re-enable once fixed upstream
  it("zipWithLatest & Debounce neverending", async () => {
    const withDebounce = await pipe(
      S.zipWithLatest_(
        S.async((cb) => {
          setTimeout(() => cb.single("a"))
          setTimeout(() => cb.single("b"), 100)
        }),
        S.async((cb) => {
          setTimeout(() => cb.single(1))
          setTimeout(() => cb.single(2), 50)
          setTimeout(() => cb.single(3), 150)
        }),
        (a, b) => [a, b] as const
      ),
      S.debounce(10),
      S.interruptWhen(T.sleep(1_000)),
      S.runCollect,
      T.runPromise
    )

    const withoutDebounce = await pipe(
      S.zipWithLatest_(
        S.async((cb) => {
          setTimeout(() => cb.single("a"))
          setTimeout(() => cb.single("b"), 100)
        }),
        S.async((cb) => {
          setTimeout(() => cb.single(1))
          setTimeout(() => cb.single(2), 50)
          setTimeout(() => cb.single(3), 150)
        }),
        (a, b) => [a, b] as const
      ),
      S.interruptWhen(T.sleep(1_000)),
      S.runCollect,
      T.runPromise
    )

    expect(withDebounce).toEqual(withoutDebounce)
  })
})
