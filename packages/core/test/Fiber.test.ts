import * as T from "../src/Effect"
import * as E from "../src/Either"
import * as Ex from "../src/Exit"
import { pipe } from "../src/Function"

describe("Fiber", () => {
  it("fork/join", async () => {
    const a = jest.fn()
    const b = jest.fn()

    const fiber = T.runUnsafeSync(
      T.fork(
        T.async<never, void>((r) => {
          const timer = setTimeout(() => {
            r(E.right(undefined))
          }, 15000)
          return (cb) => {
            clearTimeout(timer)
            cb("aaa")
          }
        })
      )
    )

    const cancelJoin = T.run(fiber.join, a)

    cancelJoin(b)

    await T.runToPromise(T.delay(T.unit, 100))

    expect(a.mock.calls.length).toBe(1)
    expect(b.mock.calls.length).toBe(1)

    expect(a.mock.calls[0][0]).toStrictEqual(Ex.interruptWithError("aaa"))
  })
  it("supervised + fork", async () => {
    const a = jest.fn()

    const f = await pipe(
      T.sequenceT(
        T.supervised(T.delay(T.pure(1), 100)),
        T.supervised(
          T.async<never, number>((r) => {
            const t = setTimeout(() => {
              r(E.right(2))
            }, 50)
            return (cb) => {
              clearTimeout(t)
              cb("err0")
              a()
            }
          })
        ),
        T.supervised(T.delay(T.pure(1), 100)),
        T.supervised(
          T.async<never, number>((r) => {
            const t = setTimeout(() => {
              r(E.right(2))
            }, 50)
            return (cb) => {
              clearTimeout(t)
              cb("err1")
              a()
            }
          })
        )
      ),
      T.chain(([fa, fb, fc, fd]) => T.sequenceT(fa.join, fb.join, fc.join, fd.join)),
      T.fork,
      T.runToPromise
    )

    const result = await T.runToPromise(T.delay(f.interrupt, 25))

    expect(result).toStrictEqual(Ex.interruptWithError("err0", "err1"))
    expect(a).toBeCalledTimes(2)
  })
  it("purely supervised", async () => {
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
      T.supervisedRegion,
      T.chainTap(() => T.delay(T.unit, 200)),
      T.provide({
        n: 1
      }),
      T.runToPromise
    )

    const result = await T.runToPromise(program.isComplete)

    expect(result).toStrictEqual(true)
    expect(interrupted).toStrictEqual(1)
    expect(runs).toBeGreaterThan(7)
    expect(runs).toBeLessThan(11)
  })
  it("supervised with finished fibers", async () => {
    let runs = 0
    let interrupted = 0
    const program = await pipe(
      T.supervised(T.delay(T.pure(1), 10)),
      T.chain(() =>
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
        )
      ),
      T.chainTap(() => T.delay(T.unit, 100)),
      T.supervisedRegion,
      T.chainTap(() => T.delay(T.unit, 200)),
      T.provide({
        n: 1
      }),
      T.runToPromise
    )

    const result = await T.runToPromise(program.isComplete)

    expect(result).toStrictEqual(true)
    expect(interrupted).toStrictEqual(1)
    expect(runs).toBeGreaterThan(7)
    expect(runs).toBeLessThan(11)
  })
})
