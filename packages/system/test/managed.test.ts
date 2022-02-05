import * as T from "../src/Effect/index.js"
import * as E from "../src/Either/index.js"
import * as Ex from "../src/Exit/index.js"
import { pipe } from "../src/Function/index.js"
import * as M from "../src/Managed/index.js"

describe("Managed", () => {
  it("absolve", async () => {
    const res = await pipe(
      M.absolve(M.succeedWith(() => E.left("error"))),
      M.useNow,
      T.result,
      T.map(Ex.untraced),
      T.runPromise
    )

    expect(res).toEqual(Ex.fail("error"))
  })
})
