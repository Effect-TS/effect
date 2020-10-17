import * as T from "../src/Effect"
import * as Ex from "../src/Exit"
import { pipe } from "../src/Function"

type A = {
  a: number
}

type B = {
  b: number
}

const program = T.gen(function* (_) {
  const a = (yield* _(T.environment<A>())).a
  const b = (yield* _(T.environment<B>())).b

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
})
