import * as T from "../src/Effect"
import { pipe } from "../src/Function"
import { has } from "../src/Has"

class CalculatorService {
  base = T.succeed(1)

  add(x: number, y: number) {
    return T.effectTotal(() => x + y)
  }

  mul = (x: number, y: number) => {
    return T.effectTotal(() => x * y)
  }
}

const Calculator = has(CalculatorService)

const { add, base, mul } = T.derive(Calculator, ["add", "mul"], ["base"])

const program = pipe(
  base,
  T.chain((b) => add(b, 2)),
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
          base: T.succeed(0)
        }),
        T.runPromise
      )
    ).toEqual(0)
  })
})
