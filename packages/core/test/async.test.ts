import * as As from "../src/Async"
import { pipe } from "../src/Function"

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
      await pipe(
        As.collectAll([As.succeed(1), As.succeed(2), As.succeed(3)] as const),
        As.runPromiseExit
      )
    ).toEqual(As.successExit([1, 2, 3]))
  })
})
