import * as T from "../src/Effect"

describe("Operators", () => {
  it("fake-pipe", async () => {
    const result = await T.succeed(0)
      ["|>"](T.chain((n) => T.succeed(n + 1)))
      ["|>"](T.runPromise)

    expect(result).toEqual(1)
  })
})
