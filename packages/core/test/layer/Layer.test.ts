import * as T from "../../src/Effect"
import * as L from "../../src/Layer"
import * as M from "../../src/Managed"
import { pipe } from "../../src/Pipe"

const ConsoleURI = Symbol()

interface Console {
  [ConsoleURI]: {
    log: (message: string) => T.Sync<void>
  }
}

function log(message: string) {
  return T.accessM((_: Console) => _[ConsoleURI].log(message))
}

const LoggerURI = Symbol()

interface Logger {
  [LoggerURI]: {
    info: (message: string) => T.Sync<void>
  }
}

function info(message: string) {
  return T.accessM((_: Logger) => _[LoggerURI].info(message))
}

const CalculatorURI = Symbol()

interface Calculator {
  [CalculatorURI]: {
    add: (x: number, y: number) => T.Sync<number>
  }
}

function add(x: number, y: number) {
  return T.accessM((_: Calculator) => _[CalculatorURI].add(x, y))
}

const Calculator = L.fromValue<Calculator>({
  [CalculatorURI]: {
    add: (x: number, y: number) => T.sync(() => x + y)
  }
})

const Logger = L.fromManagedWith<Console>()((_) =>
  M.pure<Logger>({
    [LoggerURI]: {
      info: (message) => _[ConsoleURI].log(message)
    }
  })
)

const Console = pipe(
  T.pure("prefix"),
  L.useEffect((_) =>
    L.fromEffect(
      T.sync(
        (): Console => ({
          [ConsoleURI]: {
            log: (message) =>
              T.sync(() => {
                console.log(`${_}:${message}`)
              })
          }
        })
      )
    )
  )
)

const AppLayer = pipe(L.merge(Calculator, Logger), L.join(Console))

const program = T.sequenceT(info("ok"), add(10, 2), log("done"))

const main = pipe(program, L.using(AppLayer))

describe("Layer", () => {
  it("should use layers", () => {
    const mock = jest.spyOn(console, "log").mockImplementation(() => {
      //
    })

    T.runSync(main)

    expect(mock.mock.calls).toEqual([["prefix:ok"], ["prefix:done"]])
  })
})
