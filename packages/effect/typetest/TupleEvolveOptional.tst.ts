import { pipe, Tuple } from "effect"
import { describe, expect, it } from "tstyche"

type Input = readonly [number]
type Transforms = readonly [((n: number) => string) | undefined]

const input = (): Input => [42]
const transforms = (enabled: boolean): Transforms => [enabled ? (n) => `#${n}` : undefined]
const dataFirst = (enabled: boolean) => Tuple.evolve(input(), transforms(enabled))
const dataLast = (enabled: boolean) => pipe(input(), Tuple.evolve(transforms(enabled)))

describe("Tuple.evolve optional transform result", () => {
  it("uses real producers with the accepted input and transform types", () => {
    expect(input()).type.toBe<readonly [number]>()
    expect(transforms(true)).type.toBe<readonly [((n: number) => string) | undefined]>()
    expect(transforms(false)[0]).type.toBe<((n: number) => string) | undefined>()
    expect(Tuple.evolve).type.toBeCallableWith(input(), transforms(true))
  })

  it("data-first includes transformed and unchanged outcomes", () => {
    expect(dataFirst(true)).type.toBe<readonly [number | string]>()
    expect(dataFirst(false)).type.toBe<readonly [number | string]>()
    const acceptsOnlyNumber = (_: number) => {}
    expect(acceptsOnlyNumber).type.not.toBeCallableWith(dataFirst(true)[0])
  })

  it("data-last includes transformed and unchanged outcomes", () => {
    expect(dataLast(true)).type.toBe<readonly [number | string]>()
    expect(dataLast(false)).type.toBe<readonly [number | string]>()
    const apply = Tuple.evolve<Input, Transforms>(transforms(true))
    expect(apply).type.toBeCallableWith(input())
    expect(apply(input())).type.toBe<readonly [number | string]>()
    const acceptsOnlyNumber = (_: number) => {}
    expect(acceptsOnlyNumber).type.not.toBeCallableWith(dataLast(true)[0])
  })

  it("the public instantiated return alias includes both outcomes", () => {
    type Result = ReturnType<typeof Tuple.evolve<Input, Transforms>>
    expect<Result>().type.toBe<readonly [number | string]>()
  })

  it("preserves an always-present function and its literal return", () => {
    const present: readonly [(n: number) => "formatted"] = [() => "formatted"]
    expect(Tuple.evolve(input(), present)).type.toBe<readonly ["formatted"]>()
    expect(pipe(input(), Tuple.evolve(present))).type.toBe<readonly ["formatted"]>()
    expect(Tuple.evolve(input(), [(n) => `#${n}`])).type.toBe<readonly [string]>()
  })

  it("preserves undefined-only and omitted later transforms", () => {
    const absent: readonly [undefined] = [undefined]
    const pair: readonly [number, boolean] = [42, true]
    expect(Tuple.evolve(input(), absent)).type.toBe<readonly [number]>()
    expect(pipe(input(), Tuple.evolve(absent))).type.toBe<readonly [number]>()
    expect(Tuple.evolve(pair, transforms(true))).type.toBe<readonly [number | string, boolean]>()
    expect(pipe(pair, Tuple.evolve(transforms(false)))).type.toBe<readonly [number | string, boolean]>()
    expect(Tuple.evolve(pair, [])).type.toBe<readonly [number, boolean]>()
  })

  it("preserves mutable tuple shape", () => {
    const mutable: [number, boolean] = [42, true]
    const mutableTransforms: [((n: number) => string) | undefined] = [undefined]
    expect(Tuple.evolve(mutable, transforms(true))).type.toBe<[number | string, boolean]>()
    expect(pipe(mutable, Tuple.evolve(transforms(false)))).type.toBe<[number | string, boolean]>()
    expect(Tuple.evolve(input(), mutableTransforms)).type.toBe<readonly [number | string]>()
  })

  it("preserves optional transform positions", () => {
    const optional = (enabled: boolean): readonly [((n: number) => string)?] => enabled ? [(n) => `#${n}`] : []
    expect(optional(true)).type.toBe<readonly [((n: number) => string)?]>()
    expect(Tuple.evolve(input(), optional(true))).type.toBe<readonly [number | string]>()
    expect(pipe(input(), Tuple.evolve(optional(false)))).type.toBe<readonly [number | string]>()
  })

  it("preserves optional input positions", () => {
    const optional: readonly [number?] = []
    const present: readonly [(n: number | undefined) => string] = [(n) => `${n}`]
    expect(Tuple.evolve(optional, present)).type.toBe<readonly [string?]>()
    expect(pipe(optional, Tuple.evolve(present))).type.toBe<readonly [string?]>()
    expect(Tuple.evolve(optional, [])).type.toBe<readonly [number?]>()
  })

  it("preserves union-valued function returns", () => {
    const present: readonly [(n: number) => string | boolean] = [(n) => n > 0 ? "positive" : false]
    expect(Tuple.evolve(input(), present)).type.toBe<readonly [string | boolean]>()
    expect(pipe(input(), Tuple.evolve(present))).type.toBe<readonly [string | boolean]>()
  })

  it("preserves empty readonly and mutable tuples", () => {
    const readonlyEmpty: readonly [] = []
    const mutableEmpty: [] = []
    expect(Tuple.evolve(readonlyEmpty, [])).type.toBe<readonly []>()
    expect(pipe(readonlyEmpty, Tuple.evolve([]))).type.toBe<readonly []>()
    expect(Tuple.evolve(mutableEmpty, [])).type.toBe<[]>()
    expect(pipe(mutableEmpty, Tuple.evolve([]))).type.toBe<[]>()
  })
})
