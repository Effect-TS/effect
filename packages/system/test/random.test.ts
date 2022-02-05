import * as T from "../src/Effect/index.js"
import { pipe } from "../src/Function/index.js"
import { nextIntBetween } from "../src/Random/index.js"

describe("Random", () => {
  it("returns 0 for nextIntBetween(0, 0)", async () => {
    const result = await pipe(nextIntBetween(0, 0), T.runPromise)

    expect(result).toEqual(0)
  })
})
