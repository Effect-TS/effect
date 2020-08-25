import * as T from "../src/Effect"
import * as E from "../src/Either"
import * as Exit from "../src/Exit"
import { absurd, pipe } from "../src/Function"

describe("Effect", () => {
  it("absolve", () => {
    const program = T.absolve(T.succeed(E.left("e")))

    expect(T.runSyncExit(program)).toEqual(Exit.fail("e"))
  })
  it("absorbWith", () => {
    const program = pipe(T.die("e"), T.absorbWith(absurd))
    const program2 = pipe(
      T.fail("e"),
      T.absorbWith((e) => `${e}-ok`)
    )

    expect(T.runSyncExit(program)).toEqual(Exit.fail("e"))
    expect(T.runSyncExit(program2)).toEqual(Exit.fail("e-ok"))
  })
})
