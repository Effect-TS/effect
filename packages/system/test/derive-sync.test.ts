import { pipe } from "../src/Function"
import { service, tag } from "../src/Has"
import * as Sy from "../src/Sync"

// module definition
export const CalculatorId = Symbol()

export function LiveCalculator() {
  return service({
    factor: 2,
    factorFun: (): number => 3,
    base: Sy.succeed(1),
    add: (x: number, y: number) => Sy.succeedWith(() => x + y),
    mul: (x: number, y: number) => Sy.succeedWith(() => x * y),
    gen: <A>(a: A) => Sy.succeedWith(() => a)
  })
}

export interface Calculator extends ReturnType<typeof LiveCalculator> {}

// module tag
export const Calculator = tag<Calculator>(CalculatorId)

// lifted functions
export const { add, base, factor, mul } = Sy.deriveLifted(Calculator)(
  ["add", "mul"],
  ["base"],
  ["factor"]
)

// accessM functions
export const { gen } = Sy.deriveAccessM(Calculator)(["gen"])

// access functions
export const { factorFun } = Sy.deriveAccess(Calculator)(["factorFun", "gen"])

// program
const program = pipe(
  Sy.zip_(
    gen((_) => _(1)),
    factorFun((_) => _())
  ),
  Sy.chain((_) =>
    pipe(
      Sy.do,
      Sy.bind("b", () => base),
      Sy.bind("f", () => factor),
      Sy.bind("_", () => Sy.succeed(_))
    )
  ),
  Sy.chain(
    ({
      b,
      f,
      _: {
        tuple: [x, y]
      }
    }) => Sy.chain_(add(b, f), (k) => Sy.succeed(k + x + y))
  ),
  Sy.chain((sum) => mul(sum, 3))
)

export function MockCalculator(): Calculator {
  return {
    add: () => Sy.succeed(0),
    mul: () => Sy.succeed(0),
    base: Sy.succeed(0),
    factor: 0,
    gen: Sy.succeed,
    factorFun: () => 0
  }
}

describe("Derive Access", () => {
  it("should use derived access functions", async () => {
    expect(
      await pipe(program, Sy.provideService(Calculator)(LiveCalculator()), Sy.run)
    ).toEqual(21)
  })
  it("should use mock", async () => {
    expect(
      await pipe(program, Sy.provideService(Calculator)(MockCalculator()), Sy.run)
    ).toEqual(0)
  })
})
