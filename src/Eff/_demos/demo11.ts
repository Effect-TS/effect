import { pipe } from "../../Function"
import * as T from "../Effect"
import * as L from "../Layer"

abstract class Console {
  abstract putStrLn(s: string): T.Sync<void>
}
abstract class Calculator {
  abstract add(a: number, b: number): T.Sync<number>
}

const HasConsole = T.hasClass(Console)
const HasCalculator = T.hasClass(Calculator)

const withCalculator = T.accessServiceM(HasCalculator)
const withConsole = T.accessServiceM(HasConsole)

export const ConsoleLayer = L.managedService(HasConsole)(
  T.effectTotal(
    () =>
      new (class extends Console {
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
      })()
  )
)((s) => s.dispose())

export const CalculatorLayer = L.managedService(HasCalculator)(
  T.effectTotal(
    () =>
      new (class extends Calculator {
        add(a: number, b: number): T.Sync<number> {
          return T.effectTotal(() => a + b)
        }
      })()
  )
)(() => T.unit)

export const CalculatorLayer2 = L.managedService(HasCalculator)(
  withConsole((console) =>
    T.effectTotal(
      () =>
        new (class extends Calculator {
          add(a: number, b: number): T.Sync<number> {
            return pipe(
              T.effectTotal(() => a + b),
              T.tap((n) => console.putStrLn(`(debug): ${n}`))
            )
          }
        })()
    )
  )
)(() => T.unit)

const layer = pipe(CalculatorLayer, L.zipPar(ConsoleLayer))

const program = layer.use(
  pipe(
    withCalculator((c) => c.add(0, 1)),
    T.tap((n) => withConsole((c) => c.putStrLn(`got: ${n}`)))
  )
)

T.runMain(program)
