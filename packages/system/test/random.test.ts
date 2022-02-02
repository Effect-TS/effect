import * as T from "../src/Effect"
import { pipe } from "../src/Function"
import { nextIntBetween } from "../src/Random"

describe("Random", () => {
  it("returns 0 for nextIntBetween(0, 0)", async () => {
    const result = await pipe(nextIntBetween(0, 0), T.runPromise)

    expect(result).toEqual(0)
  })
})
