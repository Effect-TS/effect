import * as T from "../src/Effect"
import * as E from "../src/Either"
import * as Ex from "../src/Exit"
import { pipe } from "../src/Function"
import * as M from "../src/Managed"
import * as O from "../src/Option"

type A = {
  a: number
}

type B = {
  b: number
}

const program = T.gen(function* (_) {
  const a = yield* _(T.access((_: A) => _.a))
  const b = yield* _(T.access((_: B) => _.b))

  const c = a + b

  if (c > 10) {
    yield* _(T.fail(`${c} should be lower then x`))
  }

  return c
})

describe("Generator", () => {
  it("should use generator program", async () => {
    const result = await T.runPromiseExit(
      pipe(
        program,
        T.provideAll<A & B>({ a: 1, b: 2 })
      )
    )

    expect(result).toEqual(Ex.succeed(3))
  })
  it("should use generator program (failing)", async () => {
    const result = await T.runPromiseExit(
      pipe(
        program,
        T.provideAll<A & B>({ a: 10, b: 2 })
      )
    )

    expect(result).toEqual(Ex.fail("12 should be lower then x"))
  })
  it("try/catch", async () => {
    const result = await T.runPromiseExit(
      T.gen(function* (_) {
        try {
          return yield* _(T.fail(1))
        } catch (e) {
          return yield* _(T.succeed((e as number) + 1))
        }
      })
    )

    expect(result).toEqual(Ex.succeed(2))
  })
  it("try/catch defects", async () => {
    const result = await T.runPromiseExit(
      T.gen(function* (_) {
        try {
          yield* _(T.die(new Error("error")))
        } catch (e) {
          return yield* _(T.succeed((e as number) + 1))
        }
      })
    )

    expect(result).toEqual(Ex.die(new Error("error")))
  })
  it("try/catch use try", async () => {
    const result = await T.runPromiseExit(
      T.gen(function* (_) {
        try {
          yield* _(
            T.try(() => {
              throw new Error("error")
            })
          )
        } catch (e) {
          return yield* _(T.succeed("gotcha"))
        }
      })
    )

    expect(result).toEqual(Ex.succeed("gotcha"))
  })
  it("mix types", async () => {
    class SumTooBig {
      readonly _tag = "SumTooBig"
      constructor(readonly message: string) {}
    }

    const open = jest.fn()
    const close = jest.fn()

    const managedNumber = pipe(
      T.effectTotal(() => {
        open()
        return 10
      }),
      M.makeExit(() =>
        T.effectTotal(() => {
          close()
        })
      )
    )

    const program = T.gen(function* (_) {
      const a = yield* _(E.right(1))
      const b = yield* _(O.some(2))
      const c = yield* _(T.access((_: A) => _.a))
      const d = yield* _(T.access((_: B) => _.b))
      const e = yield* _(managedNumber)

      expect(close).toHaveBeenCalledTimes(0)

      const s = a + b + c + d + e

      if (s > 20) {
        return yield* _(T.fail(new SumTooBig(`${s} > 20`)))
      }

      return s
    })

    expect(
      await pipe(
        program,
        T.provideAll<A & B>({ a: 3, b: 4 }),
        T.runPromiseExit
      )
    ).toEqual(Ex.succeed(20))

    expect(open).toHaveBeenCalledTimes(1)
    expect(close).toHaveBeenCalledTimes(1)
  })
})
