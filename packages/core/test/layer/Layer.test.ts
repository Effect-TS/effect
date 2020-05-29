import * as T from "../../src/Effect"
import * as L from "../../src/Layer"
import * as M from "../../src/Managed"
import { pipe } from "../../src/Pipe"

const ConsoleURI = "@matechs/core/test/layers/ConsoleURI"

interface Console {
  [ConsoleURI]: {
    log: (message: string) => T.Sync<void>
  }
}

function log(message: string) {
  return T.accessM((_: Console) => _[ConsoleURI].log(message))
}

const LoggerURI = "@matechs/core/test/layers/LoggerURI"

interface Logger {
  [LoggerURI]: {
    info: (message: string) => T.Sync<void>
  }
}

function info(message: string) {
  return T.accessM((_: Logger) => _[LoggerURI].info(message))
}

const CalculatorURI = "@matechs/core/test/layers/CalculatorURI"

interface Calculator {
  [CalculatorURI]: {
    add: (x: number, y: number) => T.Sync<number>
  }
}

function add(x: number, y: number) {
  return T.accessM((_: Calculator) => _[CalculatorURI].add(x, y))
}

class LiveCalculator implements L.Implementation<Calculator> {
  static readonly _tag = CalculatorURI

  private readonly base: number

  constructor() {
    this.base = 1
  }

  add(x: number, y: number) {
    return T.sync(() => x + y + this.base)
  }
}

const Calculator = L.fromConstructor<Calculator>()(LiveCalculator)

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

    const res = T.runUnsafeSync(main)

    expect(mock.mock.calls).toEqual([["prefix:ok"], ["prefix:done"]])
    expect(res[1]).toStrictEqual(13)
  })
})
