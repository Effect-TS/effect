import { Int } from "../../src/data/Int"

describe("Int", () => {
  it("should perform basic integer aritmetic", () => {
    const one = Int.of(1)
    const two = Int.of(2)
    const five = Int.of(5)

    const result = (one + one) * two + one

    expect(result).toEqual(five)
    expect(result / two).toEqual(two)
    expect(result % two).toEqual(one)
  })
})
