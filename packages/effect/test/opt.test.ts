import * as T from "../src/Effect"
import { pipe } from "../src/Function"

describe("Optimizations", () => {
  it("chain data first", async () => {
    expect(
      await pipe(
        T.succeed(1),
        T.chain((n) => T.succeed(n + 1)),
        T.chain((n) => T.succeed(n + 1)),
        T.chain((n) => T.succeed(n + 1)),
        T.runPromise
      )
    ).toEqual(2)
  })
})
