import * as T from "../src/Effect"
import * as Ex from "../src/Exit"
import { pipe } from "../src/Function"

const program = T.gen(function* (eff) {
  const a = yield* eff(T.access((_: { a: number }) => _.a))
  const b = yield* eff(T.access((_: { b: number }) => _.b))

  const c = a + b

  if (c > 10) {
    yield* eff(T.fail(`${c} should be lower then x`))
  }

  return c
})

describe("Generator", () => {
  it("should use generator program", async () => {
    const result = await T.runPromiseExit(pipe(program, T.provideAll({ a: 1, b: 2 })))

    expect(result).toEqual(Ex.succeed(3))
  })
})
