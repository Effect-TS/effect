import { Function } from "effect"
import { describe, expect, it } from "tstyche"

describe("Function", () => {
  it("constant preserves argument literals", () => {
    expect(Function.constant("other")).type.toBe<Function.LazyArg<"other">>()
    expect(Function.constant(1)).type.toBe<Function.LazyArg<1>>()
    expect(Function.constant(true)).type.toBe<Function.LazyArg<true>>()
    expect(Function.constant([1, "a"])).type.toBe<Function.LazyArg<readonly [1, "a"]>>()
  })

  it("memoize", () => {
    const memoized = Function.memoize((input: { readonly n: number }) => input.n)
    expect(memoized).type.toBe<(input: { readonly n: number }) => number>()

    const nullable = Function.memoize((_input: object) => null)
    expect(nullable).type.toBe<(input: object) => null>()

    expect(Function.memoize).type.not.toBeCallableWith((_input: object): undefined => undefined)
    expect(Function.memoize).type.not.toBeCallableWith((_input: object): number | undefined => undefined)
  })

  it("memoizeIdempotent", () => {
    const memoized = Function.memoizeIdempotent((input: { readonly n: number }) => input)
    expect(memoized).type.toBe<(input: { readonly n: number }) => { readonly n: number }>()

    const generic = Function.memoizeIdempotent(<A extends object>(input: A): A => input)
    type Generic = <A extends object>(input: A) => A
    expect(generic).type.toBe<Generic>()

    expect(Function.memoizeIdempotent).type.not.toBeCallableWith((_input: object): number => 1)
  })
})
