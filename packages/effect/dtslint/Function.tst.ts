import { flow, Function, identity, Option, pipe } from "effect"
import { describe, it } from "tstyche"

describe("Function", () => {
  describe("pipe", () => {
    it("We should only have one error for the missing definition", () => {
      const _x = (): number =>
        pipe(
          1,
          // @ts-expect-error: Cannot find name 'add'
          add(1),
          identity
        )

      const _y = (): (n: number) => number =>
        flow(
          // @ts-expect-error: Cannot find name 'add'
          add(1),
          identity
        )

      const _z = (): number =>
        Option.some(1).pipe(
          // @ts-expect-error: Cannot find name 'add'
          add(1),
          identity
        )
    })
  })

  it("apply", () => {
    const apply1 = Function.apply("a")
    const apply2 = Function.apply("a", 1)

    const countArgs = (...args: Array<unknown>) => args.length
    const arg1 = (a: string) => a
    const arg2 = (a: string, b: number) => `${a}${b}`
    const arg3 = (a: number) => a

    const _a1: number = apply1(countArgs)
    const _a2: string = apply1(arg1)
    // @ts-expect-error: Target signature provides too few arguments. Expected 2 or more, but got 1.
    apply1(arg2)
    // @ts-expect-error: Type 'string' is not assignable to type 'number'.
    apply1(arg3)

    const _b1: number = apply2(countArgs)
    const _b2: string = apply2(arg1)
    const _b3: string = apply2(arg2)
    // @ts-expect-error: Type 'string' is not assignable to type 'number'.
    apply1(arg3)
  })
})
