import * as A from "../src/Array"
import * as T from "../src/Effect"
import * as E from "../src/Either"
import * as Ex from "../src/Exit"
import { pipe } from "../src/Function"
import * as M from "../src/Managed"
import * as O from "../src/Option"
import * as S from "../src/Stream"
import * as X from "../src/Sync"

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

class MyError {
  readonly _tag = "MyError"
}

describe("Generator", () => {
  it("should use generator program", async () => {
    const result = await pipe(
      program,
      T.provideAll<A & B>({ a: 1, b: 2 }),
      T.runPromiseExit
    )

    expect(result).toEqual(Ex.succeed(3))
  })
  it("should use generator program (failing)", async () => {
    const result = await pipe(
      program,
      T.provideAll<A & B>({ a: 10, b: 2 }),
      T.runPromiseExit
    )

    expect(result).toEqual(Ex.fail("12 should be lower then x"))
  })
  it("catches defects", async () => {
    const result = await pipe(
      T.gen(function* (_) {
        yield* _(T.unit)
        throw new Error("defect")
      }),
      T.runPromiseExit
    )

    expect(result).toEqual(Ex.die(new Error("defect")))
  })
  it("mix types", async () => {
    class SumTooBig {
      readonly _tag = "SumTooBig"
      constructor(readonly message: string) {}
    }

    const close = jest.fn()

    const managedNumber = pipe(
      T.effectTotal(() => 10),
      M.makeExit(() =>
        T.effectTotal(() => {
          close()
        })
      )
    )

    const sum = (n: number) =>
      T.gen(function* (_) {
        let sum = 0
        for (const i of A.range(0, n)) {
          sum += yield* _(T.succeed(i))
        }
        return sum
      })

    const program1 = T.gen(function* (_) {
      const a = yield* _(E.right(1))
      const b = yield* _(O.some(2))
      const c = yield* _(T.access((_: A) => _.a))

      return { a, b, c }
    })

    const program2 = T.gen(function* (_) {
      const { a, b, c } = yield* _(program1)
      const d = yield* _(T.access((_: B) => _.b))
      const e = yield* _(managedNumber)

      expect(close).toHaveBeenCalledTimes(0)

      const s = a + b + c + d + e

      if (s > 20) {
        return yield* _(T.fail(new SumTooBig(`${s} > 20`)))
      }

      return yield* _(sum(s))
    })

    expect(
      await pipe(
        program2,
        T.provideAll<A & B>({ a: 3, b: 4 }),
        T.runPromiseExit
      )
    ).toEqual(Ex.succeed(210))

    expect(close).toHaveBeenCalledTimes(1)
  })

  it("option gen", () => {
    const result = O.gen(function* (_) {
      const a = yield* _(O.some(1))
      const b = yield* _(O.some(2))

      if (a + b > 10) {
        yield* _(O.none)
      }

      return { a, b }
    })

    expect(result).toEqual(O.some({ a: 1, b: 2 }))
  })

  it("either gen", () => {
    const result = E.gen(function* (_) {
      const a = yield* _(O.some(1))
      const b = yield* _(O.some(2))
      const c = yield* _(E.right(3))

      if (a + b + c > 10) {
        yield* _(E.left(new MyError()))
      }

      return { a, b, c }
    })

    expect(result).toEqual(E.right({ a: 1, b: 2, c: 3 }))
  })

  it("sync gen", () => {
    const result = X.gen(function* (_) {
      const a = yield* _(O.some(1))
      const b = yield* _(O.some(2))
      const c = yield* _(E.right(3))
      const d = yield* _(X.access((_: { n: number }) => _.n))

      if (a + b + c + d > 10) {
        yield* _(E.left(new MyError()))
      }

      return { a, b, c, d }
    })

    expect(pipe(result, X.runEitherEnv({ n: 4 }))).toEqual(
      E.right({ a: 1, b: 2, c: 3, d: 4 })
    )
    expect(pipe(result, X.runEitherEnv({ n: 7 }))).toEqual(E.left(new MyError()))
  })

  it("stream gen", async () => {
    const result = S.gen(function* (_) {
      const a = yield* _(S.fromArray([0, 1, 2]))
      return a
    })
    expect(await pipe(result, S.runCollect, T.runPromiseExit)).toEqual(
      Ex.succeed([0, 1, 2])
    )
  })
})
