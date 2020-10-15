import type { TypeOf } from "@effect-ts/core/Newtype"
import { typeDef } from "@effect-ts/core/Newtype"

import * as I from "../src/Iso"

const Id = typeDef<number>()("Id")
interface Id extends TypeOf<typeof Id> {}

describe("Iso", () => {
  it("newtype", () => {
    expect(I.newtype<Id>().get(1)).toEqual(I.newtype<Id>().reverseGet(Id.wrap(1)))
  })
})
