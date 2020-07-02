import { pipe } from "../../Function"
import { HasClock } from "../Clock"
import * as T from "../Effect"
import * as L from "../Layer"
import * as M from "../Managed"

export abstract class Console {
  abstract putStrLn(s: string): T.Sync<void>
}
export abstract class Calculator {
  abstract add(a: number, b: number): T.Sync<number>
}

export const HasConsole = T.hasClass(Console)
export const HasCalculator = T.hasClass(Calculator)

export const withCalculatorM = T.accessServiceM(HasCalculator)
export const withConsoleM = T.accessServiceM(HasConsole)
export const withConsole = T.accessService(HasConsole)

class LiveConsole extends Console {
  putStrLn(s: string): T.Sync<void> {
    return T.effectTotal(() => {
      console.log(s)
    })
  }

  dispose() {
    return T.effectTotal(() => {
      console.log("disposed")
    })
  }
}

export const ConsoleLayer = pipe(
  T.effectTotal(() => new LiveConsole()),
  M.makeExit((c) => c.dispose()),
  L.managedService(HasConsole)
)

class LiveCalculator extends Calculator {
  add(a: number, b: number): T.Sync<number> {
    return T.effectTotal(() => a + b)
  }
}

export const CalculatorLayer = pipe(
  T.effectTotal(() => new LiveCalculator()),
  M.fromEffect,
  L.managedService(HasCalculator)
)

class DebugCalculator extends Calculator {
  constructor(private console: Console) {
    super()
  }
  add(a: number, b: number): T.Sync<number> {
    return pipe(
      T.effectTotal(() => a + b),
      T.tap((n) => this.console.putStrLn(`(debug): ${n}`))
    )
  }
  dispose() {
    return this.console.putStrLn("close-debug-calc")
  }
}

export const DebugCalculatorLayer = pipe(
  withConsole((console) => new DebugCalculator(console)),
  M.makeExit((c) => c.dispose()),
  L.managedService(HasCalculator)
)

const layer = pipe(DebugCalculatorLayer, L.using(ConsoleLayer))

const program = layer.use(
  T.accessServicesM({
    clock: HasClock,
    calc: HasCalculator,
    console: HasConsole
  })(({ calc, clock, console }) =>
    pipe(
      calc.add(0, 1),
      T.tap(() => clock.sleep(200)),
      T.tap((n) => console.putStrLn(`got: ${n}`)),
      T.tap(() => clock.sleep(2000)),
      T.tap((n) => withConsoleM((c) => c.putStrLn(`got: ${n}`)))
    )
  )
)

T.runMain(program)
