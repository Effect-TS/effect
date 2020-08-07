import { pipe } from "../src/Function"
import { HasClock } from "../src/next/Clock"
import * as T from "../src/next/Effect"
import * as Has from "../src/next/Has"
import * as L from "../src/next/Layer"
import * as M from "../src/next/Managed"

export abstract class Console {
  abstract putStrLn(s: string): T.Sync<void>
}
export abstract class Calculator {
  abstract add(a: number, b: number): T.Sync<number>
}

export const HasConsole = Has.has(Console)
export const HasCalculator = Has.has(Calculator)

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

export const ConsoleLayer = L.service(HasConsole).fromManaged(
  M.makeExit_(
    T.effectTotal(() => new LiveConsole()),
    (c) => c.dispose()
  )
)

class LiveCalculator extends Calculator {
  add(a: number, b: number): T.Sync<number> {
    return T.effectTotal(() => a + b)
  }
}

export const CalculatorLayer = L.service(HasCalculator).fromEffect(
  T.effectTotal(() => new LiveCalculator())
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
  open() {
    return this.console.putStrLn("open-debug-calc")
  }
  dispose() {
    return this.console.putStrLn("close-debug-calc")
  }
}

export const DebugCalculatorLayer = L.service(HasCalculator)
  .prepare(withConsole((console) => new DebugCalculator(console)))
  .open((c) => c.open())
  .release((c) => c.dispose())

const layer = pipe(DebugCalculatorLayer, L.using(ConsoleLayer))

const program = T.accessServicesM({
  clock: HasClock,
  calc: HasCalculator,
  console: HasConsole
})(({ calc, clock, console }) =>
  pipe(
    calc.add(0, 1),
    T.tap(() => clock.sleep(200)),
    T.tap((n) => console.putStrLn(`got: ${n}`)),
    T.tap(() => clock.sleep(2000)),
    T.tap((n) => console.putStrLn(`got: ${n}`))
  )
)

pipe(program, T.provideSomeLayer(layer), T.runMain)
