import * as T from "../src/Effect"
import { pipe } from "../src/Function"
import * as RefM from "../src/RefM"

describe("RefM", () => {
  it("get/set", async () => {
    const program = pipe(
      RefM.makeRefM(0),
      T.tap(RefM.update((n) => T.succeed(n + 1))),
      T.tap(RefM.update((n) => T.succeed(n + 1))),
      T.chain(RefM.get)
    )
    expect(await T.runPromise(program)).toEqual(2)
  })
})
