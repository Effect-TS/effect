import * as As from "../src/Async"
import { range } from "../src/Collections/Immutable/Array/index.js"
import * as Chunk from "../src/Collections/Immutable/Chunk/index.js"
import * as Tp from "../src/Collections/Immutable/Tuple/index.js"
import { identity, pipe } from "../src/Function/index.js"

describe("Async", () => {
  it("should use async", async () => {
    function fib(n: number): As.Async<{ initial: number }, never, number> {
      if (n < 2) {
        return As.access((_: { initial: number }) => _.initial)
      }
      return pipe(
        As.suspend(() => fib(n - 1)),
        As.chain((a) =>
          pipe(
            fib(n - 2),
            As.chain((b) => As.succeed(a + b))
          )
        ),
        As.delay(0)
      )
    }

    expect(
      await As.runPromiseExit(pipe(fib(10), As.provideAll({ initial: 1 })))
    ).toEqual(As.successExit(89))
  })
  it("fold", async () => {
    expect(
      await pipe(
        As.access((_: { n: number }) => _.n),
        As.foldM(As.fail, (n) => As.succeed(n + 1)),
        As.provideAll({ n: 1 }),
        As.runPromiseExit
      )
    ).toEqual(As.successExit(2))
  })
  it("collectAll", async () => {
    expect(
      Chunk.toArray(
        await pipe(
          As.collectAll([As.succeed(1), As.succeed(2), As.succeed(3)]),
          As.runPromise
        )
      )
    ).toEqual([1, 2, 3])
  })

  it("onError", async () => {
    const throwP = async () => {
      throw new Error("err")
    }
    const rejectP = async () => Promise.reject("reject")

    expect(
      await pipe(
        As.promise(
          () => throwP(),
          (_) => "mapped u"
        ),
        As.runPromiseExit
      )
    ).toEqual(As.failExit("mapped u"))

    expect(
      await pipe(
        As.promise(
          () => rejectP(),
          (_) => "mapped u"
        ),
        As.runPromiseExit
      )
    ).toEqual(As.failExit("mapped u"))

    expect(
      await pipe(
        As.promise(() => rejectP(), identity),
        As.runPromiseExit
      )
    ).toEqual(As.failExit("reject"))
  })

  it("preserves environment in collectAll", async () => {
    const succeedOne = As.access<{ readonly one: 1 }, 1>((r) => r.one)

    expect(
      Chunk.toArray(
        await pipe(
          As.collectAll([succeedOne, succeedOne]),
          As.provideAll({ one: 1 as const }),
          As.runPromise
        )
      )
    ).toEqual([1, 1])
  })

  it("tupled", async () => {
    const program = As.tuple(As.succeed(0), As.succeed("ok"), As.fail("e"))
    const programSuccess = As.tuple(As.succeed(0), As.succeed("ok"))
    expect(await pipe(program, As.runPromiseExit)).toEqual(As.failExit("e"))
    expect(await pipe(programSuccess, As.runPromiseExit)).toEqual(
      As.successExit(new Tp.Tuple([0, "ok"]))
    )
  })

  it("forEach", async () => {
    const f = As.forEach_(range(0, 100), (n: number) => As.succeedWith(() => n + 1))
    const a = await pipe(f, As.runPromise)
    const b = await pipe(f, As.runPromise)
    expect(Chunk.toArray(a)).toEqual(Chunk.toArray(b))
    expect(Chunk.toArray(b)).toEqual(range(1, 101))
  })
  it("forEachPar", async () => {
    const results: number[] = []
    const result = await pipe(
      range(0, 10),
      As.forEachPar((n) =>
        n > 1 && n % 5 === 0
          ? As.fail(`error in process: ${n}`)
          : As.delay(10)(
              As.succeedWith(() => {
                results.push(n)
                return n
              })
            )
      ),
      As.runPromiseExit
    )
    const result_ok = await pipe(
      range(0, 10),
      As.forEachPar((n) =>
        pipe(
          As.sleep(10),
          As.map(() => n)
        )
      ),
      As.runPromise
    )
    expect(results.length).toEqual(0)
    expect(result).toEqual(As.failExit("error in process: 5"))
    expect(Chunk.toArray(result_ok)).toEqual(range(0, 10))
  })
})
