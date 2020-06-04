import * as assert from "assert"

import { pipe } from "../../src/Function"
import * as I from "../../src/Monocle/Iso"
import * as P from "../../src/Monocle/Prism"
import * as NT from "../../src/Newtype"
import * as O from "../../src/Option"

interface Name
  extends NT.Newtype<
    {
      readonly Name: unique symbol
    },
    string
  > {}

const nameI = NT.iso<Name>()

describe("Newtype", () => {
  it("runtime equivalent", () => {
    const name = I.wrap(nameI)("Michael")

    assert.deepStrictEqual(name, "Michael")
  })
  it("wrap/unwrap", () => {
    const name = I.wrap(nameI)("Michael")
    const nameS = I.unwrap(nameI)(name)

    assert.deepStrictEqual(nameS, "Michael")
  })
  it("prism", () => {
    const nameP = NT.prism<Name>((s) => s.length < 100)

    assert.deepStrictEqual(pipe("Michael", P.getOption(nameP)), O.some("Michael"))
  })
})
