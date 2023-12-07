import * as Terminal from "@effect/platform/Terminal"
import * as Console from "effect/Console"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Queue from "effect/Queue"
import * as ReadonlyArray from "effect/ReadonlyArray"

// =============================================================================
// Models
// =============================================================================

export interface MockTerminal extends Terminal.Terminal {
  readonly inputText: (text: string) => Effect.Effect<never, never, void>
  readonly inputKey: (
    key: string,
    modifiers?: Partial<MockTerminal.Modifiers>
  ) => Effect.Effect<never, never, void>
}

export declare namespace MockTerminal {
  export interface Modifiers {
    readonly ctrl: boolean
    readonly meta: boolean
    readonly shift: boolean
  }
}

// =============================================================================
// Context
// =============================================================================

export const MockTerminal = Context.Tag<Terminal.Terminal, MockTerminal>(
  "@effect/platform/Terminal"
)

// =============================================================================
// Constructors
// =============================================================================

export const make = Effect.gen(function*(_) {
  const queue = yield* _(Effect.acquireRelease(
    Queue.unbounded<Terminal.UserInput>(),
    Queue.shutdown
  ))

  const inputText: MockTerminal["inputText"] = (text: string) => {
    const inputs = ReadonlyArray.map(text.split(""), (key) => toUserInput(key))
    return Queue.offerAll(queue, inputs).pipe(Effect.asUnit)
  }

  const inputKey: MockTerminal["inputKey"] = (
    key: string,
    modifiers?: Partial<MockTerminal.Modifiers>
  ) => {
    const input = toUserInput(key, modifiers)
    return Queue.offer(queue, input).pipe(Effect.asUnit)
  }

  const display: MockTerminal["display"] = (input) => Console.log(input)

  const readInput: MockTerminal["readInput"] = Queue.take(queue).pipe(
    Effect.filterOrFail((input) => !shouldQuit(input), () => new Terminal.QuitException()),
    Effect.timeoutFail({
      duration: "2 seconds",
      onTimeout: () => new Terminal.QuitException()
    })
  )

  return MockTerminal.of({
    columns: Effect.succeed(80),
    display,
    readInput,
    readLine: Effect.succeed(""),
    inputKey,
    inputText
  })
})

// =============================================================================
// Layer
// =============================================================================

export const layer = Layer.scoped(MockTerminal, make)

// =============================================================================
// Accessors
// =============================================================================

export const { columns, readInput, readLine } = Effect.serviceConstants(MockTerminal)
export const { inputKey, inputText } = Effect.serviceFunctions(MockTerminal)

// =============================================================================
// Utilities
// =============================================================================

const shouldQuit = (input: Terminal.UserInput): boolean =>
  input.key.ctrl && (input.key.name === "c" || input.key.name === "d")

const toUserInput = (
  key: string,
  modifiers: Partial<MockTerminal.Modifiers> = {}
): Terminal.UserInput => {
  const { ctrl = false, meta = false, shift = false } = modifiers
  return {
    input: Option.some(key),
    key: { name: key, ctrl, meta, shift }
  }
}
