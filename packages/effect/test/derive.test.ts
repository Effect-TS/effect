import * as T from "../src/Effect"
import { pipe } from "../src/Function"
import { has } from "../src/Has"

// module definition

export class CalculatorService {
  factor = 2

  base = T.succeed(1)

  add(x: number, y: number) {
    return T.effectTotal(() => x + y)
  }

  mul = (x: number, y: number) => {
    return T.effectTotal(() => x * y)
  }

  gen<A>(a: A) {
    return T.effectTotal(() => a)
  }
}

// module tag
export const Calculator = has(CalculatorService)

// access functions
export const { add, base, factor, mul } = T.derive(Calculator)(
  ["add", "mul"],
  ["base"],
  ["factor"]
)

// program
const program = pipe(
  T.zip_(base, factor),
  T.chain(([b, f]) => add(b, f)),
  T.chain((sum) => mul(sum, 3))
)

describe("Derive Access", () => {
  it("should use derived access functions", async () => {
    expect(
      await pipe(
        program,
        T.provideService(Calculator)(new CalculatorService()),
        T.runPromise
      )
    ).toEqual(9)
  })
  it("should use mock", async () => {
    expect(
      await pipe(
        program,
        T.provideService(Calculator)({
          add: () => T.succeed(0),
          mul: () => T.succeed(0),
          base: T.succeed(0),
          factor: 0,
          gen: T.succeed
        }),
        T.runPromise
      )
    ).toEqual(0)
  })
})
