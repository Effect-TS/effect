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
})
