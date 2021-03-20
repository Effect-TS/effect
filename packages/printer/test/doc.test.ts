import { pipe } from "@effect-ts/system/Function"

import * as D from "../src/Core/Doc"
import * as L from "../src/Core/Layout"
import * as R from "../src/Core/Render"

describe("Doc", () => {
  it("dummy", () => {
    expect(
      pipe(
        D.catsT(
          D.text("hello"),
          D.text("world"),
          D.char("I"),
          D.text("am"),
          D.text("alive")
        ),
        L.compact,
        R.render
      )
    ).toEqual("hello\nworld\nI\nam\nalive")
  })
})
