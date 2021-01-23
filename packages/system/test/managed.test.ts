import * as T from "../src/Effect"
import * as E from "../src/Either"
import * as Ex from "../src/Exit"
import { pipe } from "../src/Function"
import * as M from "../src/Managed"

describe("Managed", () => {
  it("absolve", async () => {
    const res = await pipe(
      M.absolve(M.effectTotal(() => E.left("error"))),
      M.useNow,
      T.result,
      T.map(Ex.untraced),
      T.runPromise
    )

    expect(res).toEqual(Ex.fail("error"))
  })
})
