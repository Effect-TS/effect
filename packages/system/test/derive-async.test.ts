import * as As from "../src/Async/index.js"
import { pipe } from "../src/Function/index.js"
import { service, tag } from "../src/Has/index.js"

// module definition
export const CalculatorId = Symbol()

export function LiveCalculator() {
  return service({
    factor: 2,
    factorFun: (): number => 3,
    base: As.succeed(1),
    add: (x: number, y: number) => As.succeedWith(() => x + y),
    mul: (x: number, y: number) => As.succeedWith(() => x * y),
    gen: <A>(a: A) => As.succeedWith(() => a)
  })
}

export interface Calculator extends ReturnType<typeof LiveCalculator> {}

// module tag
export const Calculator = tag<Calculator>(CalculatorId)

// lifted functions
export const { add, base, factor, mul } = As.deriveLifted(Calculator)(
  ["add", "mul"],
  ["base"],
  ["factor"]
)

// accessM functions
export const { gen } = As.deriveAccessM(Calculator)(["gen"])

// access functions
export const { factorFun } = As.deriveAccess(Calculator)(["factorFun", "gen"])

// program
const program = pipe(
  As.zip_(
    gen((_) => _(1)),
    factorFun((_) => _())
  ),
  As.chain((_) => As.tuple(base, factor, As.succeed(_))),
  As.chain(
    ({
      tuple: [
        b,
        f,
        {
          tuple: [x, y]
        }
      ]
    }) => As.chain_(add(b, f), (k) => As.succeed(k + x + y))
  ),
  As.chain((sum) => mul(sum, 3))
)

export function MockCalculator(): Calculator {
  return {
    add: () => As.succeed(0),
    mul: () => As.succeed(0),
    base: As.succeed(0),
    factor: 0,
    gen: As.succeed,
    factorFun: () => 0
  }
}

describe("Derive Access", () => {
  it("should use derived access functions", async () => {
    expect(
      await pipe(
        program,
        As.provideService(Calculator)(LiveCalculator()),
        As.runPromise
      )
    ).toEqual(21)
  })
  it("should use mock", async () => {
    expect(
      await pipe(
        program,
        As.provideService(Calculator)(MockCalculator()),
        As.runPromise
      )
    ).toEqual(0)
  })
})
