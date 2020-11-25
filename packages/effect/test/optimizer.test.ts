import * as C from "../src/Classic/Const"
import { pipe } from "../src/Function"

describe("Optimizer", () => {
  it("should not break Const", () => {
    expect(
      pipe(
        C.makeConst("ok")(),
        C.mapLeft((s) => `s: ${s}`)
      )
    ).toEqual(`s: ok`)
  })
})
