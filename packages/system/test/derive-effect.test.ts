import * as T from "../src/Effect"
import { pipe } from "../src/Function"
import { service, tag } from "../src/Has"

// module definition
export const CalculatorId = Symbol()

export function LiveCalculator() {
  return service(CalculatorId, {
    factor: 2,
    factorFun: (): number => 3,
    base: T.succeed(1),
    add: (x: number, y: number) => T.succeedWith(() => x + y),
    mul: (x: number, y: number) => T.succeedWith(() => x * y),
    gen: <A>(a: A) => T.succeedWith(() => a)
  })
}

export interface Calculator extends ReturnType<typeof LiveCalculator> {}

// module tag
export const Calculator = tag<Calculator>(CalculatorId)

// lifted functions
export const { add, base, factor, mul } = T.deriveLifted(Calculator)(
  ["add", "mul"],
  ["base"],
  ["factor"]
)

// accessM functions
export const { gen } = T.deriveAccessM(Calculator)(["gen"])

// access functions
export const { factorFun } = T.deriveAccess(Calculator)(["factorFun", "gen"])

// program
const program = pipe(
  T.zip_(
    gen((_) => _(1)),
    factorFun((_) => _())
  ),
  T.chain((_) => T.tuple(base, factor, T.succeed(_))),
  T.chain(
    ({
      tuple: [
        b,
        f,
        {
          tuple: [x, y]
        }
      ]
    }) => T.chain_(add(b, f), (k) => T.succeed(k + x + y))
  ),
  T.chain((sum) => mul(sum, 3))
)

export function MockCalculator(): Calculator {
  return {
    serviceId: CalculatorId,
    add: () => T.succeed(0),
    mul: () => T.succeed(0),
    base: T.succeed(0),
    factor: 0,
    gen: T.succeed,
    factorFun: () => 0
  }
}

describe("Derive Access", () => {
  it("should use derived access functions", async () => {
    expect(
      await pipe(program, T.provideService(Calculator)(LiveCalculator()), T.runPromise)
    ).toEqual(21)
  })
  it("should use mock", async () => {
    expect(
      await pipe(program, T.provideService(Calculator)(MockCalculator()), T.runPromise)
    ).toEqual(0)
  })
})
