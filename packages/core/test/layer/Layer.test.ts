import * as T from "../../src/Effect"
import { pipe } from "../../src/Function"
import * as L from "../../src/Layer"

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
    info(message: string): T.Sync<void>
  }
}

function info(message: string) {
  return T.accessM((_: Logger) => _[LoggerURI].info(message))
}

const CalculatorURI = "@matechs/core/test/layers/CalculatorURI"

interface Calculator {
  [CalculatorURI]: {
    add(x: number, y: number): T.Sync<number>
  }
}

function add(x: number, y: number) {
  return T.accessM((_: Calculator) => _[CalculatorURI].add(x, y))
}

class LiveCalculator implements L.Implementation<Calculator> {
  private readonly base: number

  constructor() {
    this.base = 1
  }

  add(x: number, y: number) {
    return T.sync(() => x + y + this.base)
  }
}

const Calculator = L.fromConstructor<Calculator>(CalculatorURI)(LiveCalculator)

class LiveLogger implements L.ManagedImplementation<Logger> {
  constructor(private readonly env: Console) {}

  destroy() {
    return this.env[ConsoleURI].log("destroy")
  }

  info(message: string): T.Sync<void> {
    return this.env[ConsoleURI].log(message)
  }
}

const Logger = L.fromManagedConstructor<Logger>(LoggerURI)(LiveLogger)

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
const Console2 = pipe(
  T.pure("prefix2"),
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

const MessageURI = "@matechs/core/test/layers/MessageURI"

interface Message {
  [MessageURI]: {
    message: string
  }
}

export const Message = L.fromValue<Message>({
  [MessageURI]: {
    message: "ok"
  }
})
export const Message2 = L.fromValue<Message>({
  [MessageURI]: {
    message: "okok"
  }
})

const App = Logger.withMany(Calculator, Message, Console)

const App2 = Calculator.with(Logger)
  .with(Console.default())
  .with(Message)
  .with(Message2)
  .with(Console2)

const program = T.sequenceT(
  T.accessM((_: Message) => info(_[MessageURI].message)),
  add(10, 2),
  log("done")
)

const main = pipe(program, App.use)

describe("Layer", () => {
  it("should use layers", () => {
    const mock = jest.spyOn(console, "log").mockImplementation(() => {
      //
    })

    const res = T.runUnsafeSync(main)

    expect(mock.mock.calls).toEqual([
      ["prefix:ok"],
      ["prefix:done"],
      ["prefix:destroy"]
    ])
    expect(res[1]).toStrictEqual(13)
  })
  it("should use inverted layer", () => {
    const mock = jest.spyOn(console, "log").mockImplementation(() => {
      //
    })

    const res = T.runUnsafeSync(App2.use(program))

    expect(mock.mock.calls).toEqual([
      ["prefix2:ok"],
      ["prefix2:done"],
      ["prefix2:destroy"]
    ])
    expect(res[1]).toStrictEqual(13)
  })
})
