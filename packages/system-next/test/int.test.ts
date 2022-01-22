import { Int } from "../src/Int"

describe("Int", () => {
  it("should perform basic integer aritmetic", () => {
    const result = (Int.of(1) + Int.of(1)) * Int.of(2) + Int.of(1)

    expect(result).toEqual(Int.of(5))
    expect(result / Int.of(2)).toEqual(Int.of(2))
    expect(result % Int.of(2)).toEqual(Int.of(1))
  })
})
