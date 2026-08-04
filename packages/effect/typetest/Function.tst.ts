import { Function } from "effect"
import { describe, expect, it } from "tstyche"

describe("Function", () => {
  it("memoize", () => {
    const memoized = Function.memoize((input: { readonly n: number }) => input.n)
    expect(memoized).type.toBe<(input: { readonly n: number }) => number>()

    const nullable = Function.memoize((_input: object) => null)
    expect(nullable).type.toBe<(input: object) => null>()

    expect(Function.memoize).type.not.toBeCallableWith((_input: object): undefined => undefined)
    expect(Function.memoize).type.not.toBeCallableWith((_input: object): number | undefined => undefined)
  })
})
