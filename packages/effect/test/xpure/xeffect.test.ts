import { left } from "@effect-ts/system/Either"
import { pipe } from "@effect-ts/system/Function"

import * as T from "../../src/XPure/XEffect"

describe("XEffect", () => {
  it("access", () => {
    expect(
      pipe(
        T.access((_: number) => _),
        T.provideAll(1),
        T.run
      )
    ).toEqual(1)
  })
  it("accessM", () => {
    expect(
      pipe(
        T.accessM((_: number) => T.fail(_)),
        T.provideAll(1),
        T.runEither
      )
    ).toEqual(left(1))
  })
})
