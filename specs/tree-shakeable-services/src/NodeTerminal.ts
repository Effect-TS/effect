/**
 * The Node implementation of the terminal: one module, one layer per member
 * as a top-level export, and `layer`, the six merged: the layout of
 * `./NodeFileSystem.ts`. A root that displays without reading imports
 * `columns` and `display`, and neither `node:readline` nor the key-event
 * reader is in its bundle, because the exports that use them are unused pure
 * bindings.
 */
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import * as readline from "node:readline"
import * as Terminal from "./Terminal.ts"

/** The Node implementation of `Terminal.columns`: the implementation of a value operation is the Effect itself. */
export const columns = Layer.succeed(Terminal.columns, Effect.sync(() => process.stdout.columns ?? 80))

/** The Node implementation of `Terminal.rows`. */
export const rows = Layer.succeed(Terminal.rows, Effect.sync(() => process.stdout.rows ?? 24))

/** The Node implementation of `Terminal.size`: the current size, then every resize until the scope closes. */
export const size = Layer.succeed(
  Terminal.size,
  Effect.gen(function*() {
    const queue = yield* Queue.make<Terminal.Size>()
    const current = () => ({ columns: process.stdout.columns ?? 80, rows: process.stdout.rows ?? 24 })
    Queue.offerUnsafe(queue, current())
    const handler = () => {
      Queue.offerUnsafe(queue, current())
    }
    process.stdout.on("resize", handler)
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        process.stdout.off("resize", handler)
      })
    )
    return queue
  })
)

/** The Node implementation of `Terminal.readInput`: key events from standard input until the scope closes. */
export const readInput = Layer.succeed(
  Terminal.readInput,
  Effect.gen(function*() {
    const queue = yield* Queue.make<Terminal.UserInput>()
    const handler = (input: string | undefined, key: { name: string; ctrl: boolean }) => {
      Queue.offerUnsafe(queue, { input, key: { name: key.name, ctrl: key.ctrl } })
    }
    readline.emitKeypressEvents(process.stdin)
    process.stdin.on("keypress", handler)
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        process.stdin.off("keypress", handler)
      })
    )
    return queue
  })
)

/** The Node implementation of `Terminal.readLine`: reads one line from standard input. */
export const readLine = Layer.succeed(
  Terminal.readLine,
  Effect.callback<string, Terminal.QuitError>((resume) => {
    const rl = readline.createInterface({ input: process.stdin, terminal: false })
    rl.once("line", (line) => {
      rl.close()
      resume(Effect.succeed(line))
    })
    rl.once("close", () => resume(Effect.fail(new Terminal.QuitError())))
  })
)

/** The Node implementation of `Terminal.display`. */
export const display = Layer.succeed(
  Terminal.display,
  (text) =>
    Effect.callback<void, Terminal.TerminalError>((resume) => {
      process.stdout.write(text, (cause) =>
        resume(cause ? Effect.fail(new Terminal.TerminalError({ operation: "display", cause })) : Effect.void))
    })
)

/**
 * Every member of the Node terminal in one layer: a `Layer<Terminal>` by
 * annotation, because the record's identity is the union of its members' keys.
 */
export const layer: Layer.Layer<Terminal.Terminal> = Layer.mergeAll(columns, display, readInput, readLine, rows, size)
