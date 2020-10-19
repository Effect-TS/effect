import "../src/Operators"

import * as T from "../src/Effect"

describe("Operators", () => {
  it("fake-pipe", async () => {
    const result = await T.succeed(0)
      ["|>"](T.chain((n) => T.succeed(n + 1)))
      ["|>"](T.runPromise)

    expect(result).toEqual(1)
  })
  it("fake-flow", async () => {
    const addOne = (n: number) => T.succeed(n + 1)
    const program = addOne[">>"](T.chain((n) => T.succeed(`n: ${n}`)))

    const result = await program(0)["|>"](T.runPromise)

    expect(result).toEqual(`n: 1`)
  })
})
