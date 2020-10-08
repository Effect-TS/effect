import type { Cb, Effect } from "../src/Effect"
import * as T from "../src/Effect"
import * as E from "../src/Either"
import * as Exit from "../src/Exit"
import * as Fiber from "../src/Fiber"
import * as FiberRef from "../src/FiberRef"
import { absurd, pipe, tuple } from "../src/Function"
import * as O from "../src/Option"

describe("Effect", () => {
  it("absolve", async () => {
    const program = T.absolve(T.succeed(E.left("e")))

    expect(await T.runPromiseExit(program)).toEqual(Exit.fail("e"))
  })
  it("absorbWith", async () => {
    const program = pipe(T.die("e"), T.absorbWith(absurd))
    const program2 = pipe(
      T.fail("e"),
      T.absorbWith((e) => `${e}-ok`)
    )

    expect(await T.runPromiseExit(program)).toEqual(Exit.fail("e"))
    expect(await T.runPromiseExit(program2)).toEqual(Exit.fail("e-ok"))
  })
  it("tupled", async () => {
    const program = T.tuple(T.succeed(0), T.succeed("ok"), T.fail("e"))
    expect(await T.runPromiseExit(program)).toEqual(Exit.fail("e"))
  })
  it("mapN", async () => {
    const program = pipe(
      tuple(T.succeed(0), T.fail("e"), T.succeed("ok")),
      T.mapN(([a, _, c]) => a + c.length)
    )
    expect(await T.runPromiseExit(program)).toEqual(Exit.fail("e"))
  })
  it("memoize", async () => {
    const m = jest.fn()
    const result = await pipe(
      T.memoize((n: number) =>
        T.effectTotal(() => {
          m(n)
          return n + 1
        })
      ),
      T.chain((f) =>
        T.struct({
          a: f(0),
          b: f(0),
          c: f(1),
          d: f(1)
        })
      ),
      T.runPromiseExit
    )

    expect(result).toEqual(Exit.succeed({ a: 1, b: 1, c: 2, d: 2 }))
    expect(m).toHaveBeenNthCalledWith(1, 0)
    expect(m).toHaveBeenNthCalledWith(2, 1)
    expect(m).toHaveBeenCalledTimes(2)
  })
  it("raceAll - wait", async () => {
    const a = jest.fn()
    const b = jest.fn()
    const c = jest.fn()

    const program = T.raceAll(
      [
        T.effectAsyncInterrupt<unknown, never, number>((cb) => {
          const t = setTimeout(() => {
            cb(T.succeed(1))
          }, 5000)
          return T.effectTotal(() => {
            a()
            clearTimeout(t)
          })
        }),
        T.effectAsyncInterrupt<unknown, never, number>((cb) => {
          const t = setTimeout(() => {
            cb(T.succeed(2))
          }, 100)
          return T.effectTotal(() => {
            b()
            clearTimeout(t)
          })
        }),
        T.effectAsyncInterrupt<unknown, never, number>((cb) => {
          const t = setTimeout(() => {
            cb(T.succeed(3))
          }, 5000)
          return T.effectTotal(() => {
            c()
            clearTimeout(t)
          })
        })
      ],
      "wait"
    )

    const result = await T.runPromiseExit(program)

    expect(result).toEqual(Exit.succeed(2))

    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(0)
    expect(c).toHaveBeenCalledTimes(1)
  })
  it("raceAll", async () => {
    const a = jest.fn()
    const b = jest.fn()
    const c = jest.fn()

    const program = T.raceAll([
      T.effectAsyncInterrupt<unknown, never, number>((cb) => {
        const t = setTimeout(() => {
          cb(T.succeed(1))
        }, 5000)
        return T.effectTotal(() => {
          a()
          clearTimeout(t)
        })
      }),
      T.effectAsyncInterrupt<unknown, never, number>((cb) => {
        const t = setTimeout(() => {
          cb(T.succeed(2))
        }, 100)
        return T.effectTotal(() => {
          b()
          clearTimeout(t)
        })
      }),
      T.effectAsyncInterrupt<unknown, never, number>((cb) => {
        const t = setTimeout(() => {
          cb(T.succeed(3))
        }, 5000)
        return T.effectTotal(() => {
          c()
          clearTimeout(t)
        })
      })
    ])

    const result = await T.runPromiseExit(program)

    expect(result).toEqual(Exit.succeed(2))

    expect(a).toHaveBeenCalledTimes(0)
    expect(b).toHaveBeenCalledTimes(0)
    expect(c).toHaveBeenCalledTimes(0)

    await T.runPromise(T.sleep(100))

    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(0)
    expect(c).toHaveBeenCalledTimes(1)
  })
  it("timeout", async () => {
    const f = jest.fn()
    const result = await pipe(
      T.effectAsyncInterrupt<unknown, never, number>((cb) => {
        const timer = setTimeout(() => {
          cb(T.succeed(1))
        }, 2000)
        return T.effectTotal(() => {
          f()
          clearTimeout(timer)
        })
      }),
      T.timeout(100),
      T.runPromise
    )

    expect(result).toEqual(O.none)
    expect(f).toHaveBeenCalledTimes(1)
  })
  it("timeoutFail", async () => {
    const f = jest.fn()
    const result = await pipe(
      T.effectAsyncInterrupt<unknown, never, number>((cb) => {
        const timer = setTimeout(() => {
          cb(T.succeed(1))
        }, 2000)
        return T.effectTotal(() => {
          f()
          clearTimeout(timer)
        })
      }),
      T.timeoutFail(100, () => "timeout"),
      T.runPromiseExit
    )

    expect(result).toEqual(Exit.fail("timeout"))
    expect(f).toHaveBeenCalledTimes(1)
  })
  it("chainError", async () => {
    const result = await pipe(
      T.fail("error"),
      T.chainError((e) => T.effectTotal(() => `(${e})`)),
      T.runPromiseExit
    )

    expect(result).toEqual(Exit.fail("(error)"))
  })
  it("forkAs", async () => {
    const result = await pipe(
      FiberRef.get(Fiber.fiberName),
      T.forkAs("fiber-A"),
      T.chain(Fiber.join),
      T.runPromise
    )
    expect(result).toEqual(O.some("fiber-A"))
  })
  it("effectAsyncM", async () => {
    const result = await pipe(
      T.effectAsyncM((cb: Cb<Effect<{ bar: string }, never, string>>) =>
        T.access((r: { foo: string }) => {
          setTimeout(() => {
            cb(T.access((b) => `${r.foo} - ${b.bar}`))
          }, 200)
        })
      ),
      T.provideAll({ bar: "bar", foo: "foo" }),
      T.runPromise
    )

    expect(result).toEqual("foo - bar")
  })
})
