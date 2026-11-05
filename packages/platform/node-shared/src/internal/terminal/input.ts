import type * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import * as RcRef from "effect/RcRef"
import type * as Scope from "effect/Scope"
import type * as Terminal from "effect/Terminal"
import * as readline from "node:readline"

/**
 * The `stdin` and `readline` state shared by `readInput` and `readLine`.
 *
 * @internal
 */
export interface InputShape {
  readonly shouldQuit: (input: Terminal.UserInput) => boolean
  /** Lines read by the `readline` interface, kept between `readLine` calls. */
  readonly lines: Queue.Queue<string, Cause.Done>
  /** Whether `stdin` has ended. */
  readonly inputEnded: () => boolean
  /** Accesses `process.stdin` on first use. */
  readonly getStdin: () => typeof process.stdin
  /** The `readline` interface, emitting keypress events on `stdin`. */
  readonly readline: RcRef.RcRef<unknown>
  /** TTY raw mode, enabled while held. */
  readonly rawMode: RcRef.RcRef<void>
}

/** @internal */
export class Input extends Context.Service<Input, InputShape>()("@effect/platform-node-shared/NodeTerminal/Input") {}

/** @internal */
export const make: (
  shouldQuit: (input: Terminal.UserInput) => boolean
) => Effect.Effect<InputShape, never, Scope.Scope> = Effect.fnUntraced(
  function*(shouldQuit: (input: Terminal.UserInput) => boolean) {
    const lines = yield* Queue.make<string, Cause.Done>()

    // stdin "end" fires once per process, so remember end-of-input for readers
    // created after the event (Bun never sets `readableEnded`).
    let inputEnded = false
    let readlineActive = false
    const onStdinEnd = () => {
      inputEnded = true
      if (!readlineActive) {
        Queue.endUnsafe(lines)
      }
    }
    // Node's stdio getters can set O_NONBLOCK on inherited pipes, so only
    // access a stream from an operation that uses it.
    let stdin: typeof process.stdin | undefined
    const getStdin = () => {
      if (stdin === undefined) {
        stdin = process.stdin
        if (stdin.readableEnded) {
          onStdinEnd()
        } else {
          stdin.once("end", onStdinEnd)
        }
      }
      return stdin
    }
    yield* Effect.addFinalizer(() => Effect.sync(() => stdin?.off("end", onStdinEnd)))

    const rlRef = yield* RcRef.make({
      acquire: Effect.acquireRelease(
        Effect.sync(() => {
          const stdin = getStdin()
          const rl = readline.createInterface({ input: stdin, escapeCodeTimeout: 50 })
          const onLine = (line: string) => Queue.offerUnsafe(lines, line)
          const onClose = () => {
            readlineActive = false
            Queue.endUnsafe(lines)
          }
          readlineActive = true
          readline.emitKeypressEvents(stdin, rl)
          rl.on("line", onLine)
          rl.once("close", onClose)
          return { rl, onClose, onLine }
        }),
        ({ rl, onClose, onLine }) =>
          Effect.sync(() => {
            readlineActive = false
            rl.off("line", onLine)
            rl.off("close", onClose)
            rl.close()
            if (inputEnded) {
              Queue.endUnsafe(lines)
            }
          })
      ),
      idleTimeToLive: "10 millis"
    })

    // Only key input needs raw mode; `readLine` never requests it.
    const setRawMode = (enabled: boolean) =>
      Effect.sync(() => {
        const stdin = getStdin()
        if (stdin.isTTY) stdin.setRawMode(enabled)
      })
    const rawModeRef = yield* RcRef.make({
      acquire: Effect.acquireRelease(setRawMode(true), () => setRawMode(false)),
      idleTimeToLive: "10 millis"
    })

    return {
      shouldQuit,
      lines,
      inputEnded: () => inputEnded,
      getStdin,
      readline: rlRef,
      rawMode: rawModeRef
    }
  }
)

/**
 * Ends key input on bare Esc, Ctrl+C, or Ctrl+D.
 *
 * @internal
 */
export const defaultShouldQuit = (input: Terminal.UserInput): boolean => {
  const key = input.key
  return key.name === "escape" ||
    (key.ctrl && (key.name === "c" || key.name === "d"))
}

/**
 * The default `Input`. `readInput` and `readLine` both provide this one
 * layer, so a merge of the two builds a single `Input`, by layer memoization.
 *
 * @internal
 */
export const layer: Layer.Layer<Input> = Layer.effect(Input, make(defaultShouldQuit))
