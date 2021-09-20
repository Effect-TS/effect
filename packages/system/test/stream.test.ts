import * as A from "../src/Collections/Immutable/Chunk"
import * as Tp from "../src/Collections/Immutable/Tuple"
import * as T from "../src/Effect"
import * as Exit from "../src/Exit"
import { flow, identity, pipe, tuple } from "../src/Function"
import * as M from "../src/Managed"
import * as O from "../src/Option"
import * as R from "../src/Ref"
import * as SC from "../src/Schedule"
import * as S from "../src/Stream"
import * as BufferedPull from "../src/Stream/BufferedPull"
import * as Pull from "../src/Stream/Pull"
import * as SK from "../src/Stream/Sink"

describe("Stream", () => {
  describe("Broadcast", () => {
    it("should broadcast", async () => {
      const fn = jest.fn()

      const stream = pipe(
        R.makeRef(0),
        T.map((ref) =>
          S.repeatEffect(T.delay(100)(R.updateAndGet_(ref, (n) => n + 1)))
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
      const a = S.fromChunk(A.many(0, 1, 2))

      expect(await T.runPromise(S.runCollect(a))).toEqual([0, 1, 2])
    })
  })

  it("groupByKey", async () => {
    expect(
      await pipe(
        S.fromIterable(["hello", "world", "hi", "holla"]),
        S.groupByKey((a) => a[0]),
        S.mergeGroupBy((k, s) =>
          pipe(
            s,
            S.take(2),
            S.map((_) => [k, _] as const)
          )
        ),
        S.runCollect,
        T.runPromise
      )
    ).toEqual([
      ["h", "hello"],
      ["h", "hi"],
      ["w", "world"]
    ])
  })

  it("interleave", async () => {
    expect(
      await pipe(
        S.fromChunk(A.many(1, 1, 1, 1, 1, 1, 1, 1, 1, 1)),
        S.interleave(S.fromChunk(A.many(2, 2, 2, 2, 2, 2, 2, 2, 2, 2))),
        S.take(5),
        S.runCollect,
        T.runPromise
      )
    ).toEqual([1, 2, 1, 2, 1])
  })

  it("intersperse", async () => {
    expect(
      await pipe(
        S.fromChunk(A.many(1, 1, 1, 1, 1, 1, 1, 1, 1, 1)),
        S.intersperse(2),
        S.take(5),
        S.runCollect,
        T.runPromise
      )
    ).toEqual([1, 2, 1, 2, 1])
  })

  describe("BufferedPull", () => {
    it("pullArray", async () => {
      const program = pipe(
        R.makeRef(0),
        T.chain(
          flow(
            R.modify((i) =>
              Tp.tuple(i < 5 ? T.succeed(A.single(i)) : T.fail(O.none), i + 1)
            ),
            T.flatten,
            BufferedPull.make
          )
        ),
        T.zip(T.succeed([] as number[])),
        T.chain(({ tuple: [bp, res] }) =>
          T.catchAll_(
            T.repeatWhile_(
              BufferedPull.ifNotDone(
                T.foldM_(
                  T.chain_(BufferedPull.pullChunk(bp), (a) => {
                    res.push(...a)
                    return T.succeed(a)
                  }),
                  O.fold(() => Pull.end, Pull.fail),
                  () => T.succeed(true)
                )
              )(bp),
              identity
            ),
            () => T.succeed(res)
          )
        )
      )

      expect(await pipe(program, T.result, T.map(Exit.untraced), T.runPromise)).toEqual(
        Exit.succeed([0, 1, 2, 3, 4])
      )
    })

    it("effectAsync", async () => {
      const result = await pipe(
        S.effectAsync<unknown, never, number>((cb) => {
          let counter = 0
          const timer = setInterval(() => {
            if (counter > 2) {
              clearInterval(timer)
              cb(T.fail(O.none))
            } else {
              cb(T.succeed(A.single(counter)))
              counter++
            }
          }, 10)
        }),
        S.runCollect,
        T.runPromise
      )
      expect(result).toEqual([0, 1, 2])
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

      expect(await pipe(streamA, S.merge(streamB), S.runCollect, T.runPromise)).toEqual(
        [1, 2, 1, 1, 2]
      )
    })
  })

  it("zipN", async () => {
    expect(
      await pipe(
        S.zipN(
          S.fromChunk(A.many(1, 1, 1, 1)),
          S.fromChunk(A.many("a", "b", "c", "d")),
          S.fromChunk(A.many(2, 2, 2, 2)),
          S.fromChunk(A.many("e", "f", "g", "h"))
        )(tuple),
        S.runCollect,
        T.runPromise
      )
    ).toEqual([
      [1, "a", 2, "e"],
      [1, "b", 2, "f"],
      [1, "c", 2, "g"],
      [1, "d", 2, "h"]
    ])
  })

  it("crossN", async () => {
    expect(
      await pipe(
        S.crossN(
          S.fromChunk(A.many(1, 2)),
          S.fromChunk(A.many("a", "b")),
          S.fromChunk(A.many(3, 4))
        )(tuple),
        S.runCollect,
        T.runPromise
      )
    ).toEqual([
      [1, "a", 3],
      [1, "a", 4],
      [1, "b", 3],
      [1, "b", 4],
      [2, "a", 3],
      [2, "a", 4],
      [2, "b", 3],
      [2, "b", 4]
    ])
  })

  it("range", async () => {
    expect(await pipe(S.range(2, 8), S.runCollect, T.runPromise)).toEqual([
      2, 3, 4, 5, 6, 7
    ])
  })

  it("sums", async () => {
    expect(await pipe(S.fromIterable([1, 2, 3]), S.run(SK.sum), T.runPromise)).toEqual(
      6
    )
  })

  it("chainParSwitch", async () => {
    expect(
      await pipe(
        S.fromIterable([1, 2, 3]),
        S.chainParSwitch(
          10,
          (n) => S.fromChunk<number>(A.from([n, n ** 2, n ** 3])),
          undefined
        ),
        S.runCollect,
        T.runPromise
      )
    ).toEqual([1, 1, 1, 2, 4, 8, 3, 9, 27])
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

  it("debounces", async () => {
    const result = await pipe(
      S.fromIterable([1, 2, 3]),
      S.fixed(5),
      S.debounce(20),
      S.runCollect,
      T.runPromise
    )
    console.log("ALL DONE", result)
  })

  /*
  it("debounce + zipWithLatest", async () => {
    const result = await pipe(
      S.zipWithLatest(
        pipe(S.fromIterable([1, 2, 3]), S.schedule(SC.spaced(5))),
        pipe(S.fromIterable([1, 2, 3]), S.schedule(SC.spaced(10)))
      )((a, b) => [a, b] as const),
      S.debounce(20),
      S.runCollect,
      T.runPromise
    )
  })
  */

  it("debounces", async () => {
    const result = await pipe(
      S.fromIterable([1, 2, 3]),
      S.fixed(5),
      S.debounce(20),
      S.runCollect,
      T.runPromise
    )

    expect(result).toEqual([3])
  })

  it("zipWithLatest & interruptWhen", async () => {
    const source = S.effectAsync<unknown, unknown, string>((cb) => {
      setTimeout(() => cb(T.succeed(A.single("C1"))), 10)
      setTimeout(() => cb(T.succeed(A.single("C2"))), 20)
      setTimeout(() => cb(T.fail(O.none)), 30)
    })

    const zipped = S.zipWithLatest(source, source)((c, e) => `${c}-${e}`)

    const res0 = await pipe(
      zipped,
      S.interruptWhen(T.sleep(1_000)),
      S.runCollect,
      T.runPromise
    )

    const res1 = await pipe(zipped, S.runCollect, T.runPromise)

    expect(res0).toEqual(res1)
  })
})
