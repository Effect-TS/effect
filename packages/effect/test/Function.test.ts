import { describe, it } from "@effect/vitest"
import { deepStrictEqual, strictEqual, throws } from "@effect/vitest/utils"
import { Function, String } from "effect"

const f = (n: number): number => n + 1
const g = (n: number) => n * 2

describe("Function", () => {
  it("apply", () => {
    const countArgs = (...args: Array<unknown>) => args.length

    deepStrictEqual(Function.pipe(countArgs, Function.apply("a")), 1)
    deepStrictEqual(Function.pipe(countArgs, Function.apply("a", "b", "c")), 3)
  })

  it("compose", () => {
    deepStrictEqual(Function.pipe(String.length, Function.compose((n) => n * 2))("aaa"), 6)
    deepStrictEqual(Function.compose(String.length, (n) => n * 2)("aaa"), 6)
  })

  it("flip", () => {
    const f = (a: number) => (b: string) => a - b.length
    const g = (a: number, i = 0) => (b: number) => a ** b + i

    deepStrictEqual(Function.flip(f)("aaa")(2), -1)
    deepStrictEqual(Function.flip(g)(2)(2, 1), 5)
  })

  it("unsafeCoerce", () => {
    deepStrictEqual(Function.unsafeCoerce, Function.identity)
  })

  it("satisfies", () => {
    deepStrictEqual(Function.satisfies<number>()(5), 5)
    // @ts-expect-error
    deepStrictEqual(Function.satisfies<string>()(5), 5)
  })

  it("constant", () => {
    deepStrictEqual(Function.constant("a")(), "a")
  })

  it("constTrue", () => {
    deepStrictEqual(Function.constTrue(), true)
  })

  it("constFalse", () => {
    deepStrictEqual(Function.constFalse(), false)
  })

  it("constNull", () => {
    deepStrictEqual(Function.constNull(), null)
  })

  it("constUndefined", () => {
    deepStrictEqual(Function.constUndefined(), undefined)
  })

  it("constVoid", () => {
    deepStrictEqual(Function.constVoid(), undefined)
  })

  it("absurd", () => {
    throws(() => Function.absurd<string>(null as any as never))
  })

  it("hole", () => {
    throws(() => Function.hole<string>())
  })

  it("SK", () => {
    strictEqual(Function.SK(1, 2), 2)
  })

  it("tupled", () => {
    const f1 = (a: number): number => a * 2
    const f2 = (a: number, b: number): number => a + b
    const u1 = Function.tupled(f1)
    const u2 = Function.tupled(f2)
    deepStrictEqual(u1([1]), 2)
    deepStrictEqual(u2([1, 2]), 3)
  })

  it("untupled", () => {
    const f1 = (a: readonly [number]): number => a[0] * 2
    const f2 = (a: readonly [number, number]): number => a[0] + a[1]
    const u1 = Function.untupled(f1)
    const u2 = Function.untupled(f2)
    deepStrictEqual(u1(1), 2)
    deepStrictEqual(u2(1, 2), 3)
  })

  it("pipe()", () => {
    const pipe = Function.pipe // this alias is required in order to exclude the `@effect/babel-plugin` compiler and get 100% coverage
    // @effect-diagnostics-next-line unnecessaryPipe:off
    deepStrictEqual(pipe(2), 2)
    deepStrictEqual(pipe(2, f), 3)
    deepStrictEqual(pipe(2, f, g), 6)
    deepStrictEqual(pipe(2, f, g, f), 7)
    deepStrictEqual(pipe(2, f, g, f, g), 14)
    deepStrictEqual(pipe(2, f, g, f, g, f), 15)
    deepStrictEqual(pipe(2, f, g, f, g, f, g), 30)
    deepStrictEqual(pipe(2, f, g, f, g, f, g, f), 31)
    deepStrictEqual(pipe(2, f, g, f, g, f, g, f, g), 62)
    deepStrictEqual(pipe(2, f, g, f, g, f, g, f, g, f), 63)
    deepStrictEqual(pipe(2, f, g, f, g, f, g, f, g, f, g), 126)
    deepStrictEqual(pipe(2, f, g, f, g, f, g, f, g, f, g, f), 127)
    deepStrictEqual(pipe(2, f, g, f, g, f, g, f, g, f, g, f, g), 254)
    deepStrictEqual(pipe(2, f, g, f, g, f, g, f, g, f, g, f, g, f), 255)
    deepStrictEqual(pipe(2, f, g, f, g, f, g, f, g, f, g, f, g, f, g), 510)
    deepStrictEqual(pipe(2, f, g, f, g, f, g, f, g, f, g, f, g, f, g, f), 511)
    deepStrictEqual(pipe(2, f, g, f, g, f, g, f, g, f, g, f, g, f, g, f, g), 1022)
    deepStrictEqual(pipe(2, f, g, f, g, f, g, f, g, f, g, f, g, f, g, f, g, f), 1023)
    deepStrictEqual(pipe(2, f, g, f, g, f, g, f, g, f, g, f, g, f, g, f, g, f, g), 2046)
    deepStrictEqual(pipe(2, f, g, f, g, f, g, f, g, f, g, f, g, f, g, f, g, f, g, f), 2047)
    deepStrictEqual(
      (Function.pipe as any)(...[2, f, g, f, g, f, g, f, g, f, g, f, g, f, g, f, g, f, g, f, g]),
      4094
    )
  })

  it("flow", () => {
    const flow = Function.flow // this alias is required in order to exclude the `@effect/babel-plugin` compiler and get 100% coverage
    deepStrictEqual(flow(f)(2), 3)
    deepStrictEqual(flow(f, g)(2), 6)
    deepStrictEqual(flow(f, g, f)(2), 7)
    deepStrictEqual(flow(f, g, f, g)(2), 14)
    deepStrictEqual(flow(f, g, f, g, f)(2), 15)
    deepStrictEqual(flow(f, g, f, g, f, g)(2), 30)
    deepStrictEqual(flow(f, g, f, g, f, g, f)(2), 31)
    deepStrictEqual(flow(f, g, f, g, f, g, f, g)(2), 62)
    deepStrictEqual(flow(f, g, f, g, f, g, f, g, f)(2), 63)
    // this is just to satisfy noImplicitReturns and 100% coverage
    deepStrictEqual((Function.flow as any)(...[f, g, f, g, f, g, f, g, f, g]), undefined)
  })

  describe("dual", () => {
    it("arity as predicate", () => {
      const f = Function.dual<
        (that: number) => (self: number) => number,
        (self: number, that: number) => number
      >((args) => args.length >= 2, (a: number, b: number): number => a - b)
      deepStrictEqual(f(3, 2), 1)
      deepStrictEqual(Function.pipe(3, f(2)), 1)
      // should ignore excess arguments
      deepStrictEqual(f.apply(null, [3, 2, 100] as any), 1)
    })

    it("arity: 0", () => {
      throws(() =>
        Function.dual<
          () => () => number,
          () => number
        >(0, (): number => 2), new RangeError("Invalid arity 0"))
    })

    it("arity: 1", () => {
      throws(() =>
        Function.dual<
          () => (self: number) => number,
          (self: number) => number
        >(1, (self: number): number => self * 2), new RangeError("Invalid arity 1"))
    })

    it("arity: 2", () => {
      const f = Function.dual<
        (that: number) => (self: number) => number,
        (self: number, that: number) => number
      >(2, (a: number, b: number): number => a - b)
      deepStrictEqual(f(3, 2), 1)
      deepStrictEqual(Function.pipe(3, f(2)), 1)
      // should ignore excess arguments
      deepStrictEqual(f.apply(null, [3, 2, 100] as any), 1)
    })

    it("arity: 5", () => {
      const f = Function.dual<
        (a: string, b: string, c: string, d: string) => (self: string) => string,
        (self: string, a: string, b: string, c: string, d: string) => string
      >(5, (self: string, a: string, b: string, c: string, d: string): string => self + a + b + c + d)
      deepStrictEqual(f("_", "a", "b", "c", "d"), "_abcd")
      deepStrictEqual(Function.pipe("_", f("a", "b", "c", "d")), "_abcd")
      // should ignore excess arguments
      deepStrictEqual(f.apply(null, ["_", "a", "b", "c", "d", "e"] as any), "_abcd")
    })

    it("arity > 5", () => {
      const f = Function.dual<
        (a: string, b: string, c: string, d: string, e: string) => (self: string) => string,
        (self: string, a: string, b: string, c: string, d: string, e: string) => string
      >(6, (self: string, a: string, b: string, c: string, d: string, e: string): string => self + a + b + c + d + e)
      deepStrictEqual(f("_", "a", "b", "c", "d", "e"), "_abcde")
      deepStrictEqual(Function.pipe("_", f("a", "b", "c", "d", "e")), "_abcde")
      // should ignore excess arguments
      deepStrictEqual(f.apply(null, ["_", "a", "b", "c", "d", "e", "f"] as any), "_abcde")
    })
  })
})
