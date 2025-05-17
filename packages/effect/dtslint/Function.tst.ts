import { flow, Function, identity, Option, pipe } from "effect"
import { describe, expect, it } from "tstyche"

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

    expect(apply1(countArgs)).type.toBe<number>()
    expect(apply1(arg1)).type.toBe<string>()
    expect(apply1).type.not.toBeCallableWith(arg2)
    expect(apply1).type.not.toBeCallableWith(arg3)

    expect(apply2(countArgs)).type.toBe<number>()
    expect(apply2(arg1)).type.toBe<string>()
    expect(apply2(arg2)).type.toBe<string>()
    expect(apply1).type.not.toBeCallableWith(arg3)
  })
})
