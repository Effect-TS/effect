import { typeDef, newtype, TypeOf, genericDef, Generic } from "../src/Newtype"

const Int_ = typeDef<number>()("@newtype/Int")

interface Int extends TypeOf<typeof Int_> {}

const Int = newtype<Int>()(Int_)

const Sum = genericDef("@newtype/Sum")

interface Sum<T> extends Generic<T, typeof Sum> {}

function getN(S: Sum<Int>) {
  return Int.unwrap(Sum(Int).unwrap(S))
}

describe("Newtype", () => {
  it("Int newtype", () => {
    expect(getN(Sum(Int).wrap(Int.wrap(3)))).toBe(3)
  })
})
