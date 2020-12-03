import * as T from "../src/Effect"
import * as Exit from "../src/Exit"
import { flow, identity, pipe } from "../src/Function"
import * as O from "../src/Option"
import * as R from "../src/Ref"
import * as S from "../src/Stream"
import * as BufferedPull from "../src/Stream/BufferedPull"
import * as Pull from "../src/Stream/Pull"

describe("Stream", () => {
  describe("Core", () => {
    it("fromArray", async () => {
      const a = S.fromChunk([0, 1, 2])

      expect(await T.runPromise(S.runCollect(a))).toEqual([0, 1, 2])
    })
  })

  it("groupByKey", async () => {
    expect(
      await pipe(
        S.fromIterable(["hello", "world", "hi", "holla"]),
        S.groupByKey((a) => a[0]),
        S.processGroups((k, s) =>
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
        S.fromChunk([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]),
        S.interleave(S.fromChunk([2, 2, 2, 2, 2, 2, 2, 2, 2, 2])),
        S.take(5),
        S.runCollect,
        T.runPromise
      )
    ).toEqual([1, 2, 1, 2, 1])
  })

  it("intersperse", async () => {
    expect(
      await pipe(
        S.fromChunk([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]),
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
            R.modify((i): [T.IO<O.Option<never>, readonly number[]>, number] => [
              i < 5 ? T.succeed([i]) : T.fail(O.none),
              i + 1
            ]),
            T.flatten,
            BufferedPull.make
          )
        ),
        T.zip(T.succeed([] as number[])),
        T.chain(([bp, res]) =>
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
              cb(T.succeed([counter]))
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

      expect(
        await pipe(streamA, S.merge(streamB), S.runCollect, T.runPromise)
      ).toEqual([1, 2, 1, 1, 2])
    })
  })
})
