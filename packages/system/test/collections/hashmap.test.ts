import { hash } from "@effect-ts/system/Structural"

import * as HM from "../../src/Collections/Immutable/HashMap/index.js"
import { pipe } from "../../src/Function/index.js"

describe("HashMap", () => {
  it("hasHash_", () => {
    expect(HM.hasHash_(pipe(HM.make<number, number>(), HM.set(0, 0)), 0, hash(0))).toBe(
      true
    )
  })
})
