import * as T from "../src/Effect"
import * as Ex from "../src/Exit"
import { pipe } from "../src/Pipe"

describe("Fiber", () => {
  it("fork a new fiber", async () => {
    let runs = 0
    const program = await pipe(
      T.fork(
        T.forever(
          T.delay(
            T.access((_: { n: number }) => {
              runs += _.n
            }),
            10
          )
        )
      ),
      T.chainTap(() => T.delay(T.unit, 100)),
      T.chain((f) => f.interrupt),
      T.provide({
        n: 1
      }),
      T.runToPromise
    )

    expect(Ex.isInterrupt(program)).toBe(true)
    expect(runs).toBeGreaterThan(8)
    expect(runs).toBeLessThan(11)
  })
  it("fork a new supervised fiber", async () => {
    let runs = 0
    let interrupted = 0
    const program = await pipe(
      T.supervised(
        T.forever(
          T.onInterrupted_(
            T.delay(
              T.access((_: { n: number }) => {
                runs += _.n
              }),
              10
            ),
            T.sync(() => {
              interrupted += 1
            })
          )
        )
      ),
      T.chainTap(() => T.delay(T.unit, 100)),
      T.provide({
        n: 1
      }),
      T.runToPromise
    )

    const result = await T.runToPromise(program.isComplete)

    expect(result).toStrictEqual(true)
    expect(interrupted).toStrictEqual(1)
    expect(runs).toBeGreaterThan(8)
    expect(runs).toBeLessThan(11)
  })
})
