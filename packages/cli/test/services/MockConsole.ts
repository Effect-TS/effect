import * as Console from "effect/Console"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as ReadonlyArray from "effect/ReadonlyArray"
import * as Ref from "effect/Ref"

export interface MockConsole extends Console.Console {
  readonly getLines: (
    params?: Partial<{
      readonly stripAnsi: boolean
    }>
  ) => Effect.Effect<never, never, ReadonlyArray<string>>
}

export const MockConsole = Context.Tag<Console.Console, MockConsole>(
  "effect/Console"
)
const pattern = new RegExp(
  [
    "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
    "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PRZcf-ntqry=><~]))"
  ].join("|"),
  "g"
)

const stripAnsi = (str: string) => str.replace(pattern, "")

export const make = Effect.gen(function*(_) {
  const lines = yield* _(Ref.make(ReadonlyArray.empty<string>()))

  const getLines: MockConsole["getLines"] = (params = {}) =>
    Ref.get(lines).pipe(Effect.map((lines) =>
      params.stripAnsi || false
        ? ReadonlyArray.map(lines, stripAnsi)
        : lines
    ))

  const log: MockConsole["log"] = (...args) => Ref.update(lines, ReadonlyArray.appendAll(args))

  return MockConsole.of({
    [Console.TypeId]: Console.TypeId,
    getLines,
    log,
    unsafe: globalThis.console,
    assert: () => Effect.unit,
    clear: Effect.unit,
    count: () => Effect.unit,
    countReset: () => Effect.unit,
    debug: () => Effect.unit,
    dir: () => Effect.unit,
    dirxml: () => Effect.unit,
    error: () => Effect.unit,
    group: () => Effect.unit,
    groupEnd: Effect.unit,
    info: () => Effect.unit,
    table: () => Effect.unit,
    time: () => Effect.unit,
    timeEnd: () => Effect.unit,
    timeLog: () => Effect.unit,
    trace: () => Effect.unit,
    warn: () => Effect.unit
  })
})

export const getLines = (
  params?: Partial<{
    readonly stripAnsi?: boolean
  }>
): Effect.Effect<never, never, ReadonlyArray<string>> =>
  Effect.consoleWith((console) => (console as MockConsole).getLines(params))
