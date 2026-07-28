/**
 * Shared Node.js implementation of Effect's `Terminal` service.
 *
 * `NodeTerminal` adapts Node's `readline` APIs plus the current process
 * `stdin` and `stdout` streams into {@link Terminal.Terminal}. The service can
 * display output, read a line, stream key input, and read terminal dimensions.
 * `make` manages readline and TTY raw mode in a scope, while `layer` provides
 * the default service that ends key input on Ctrl+C or Ctrl+D.
 *
 * @since 4.0.0
 */
import type * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import { badArgument, type PlatformError } from "effect/PlatformError"
import * as Predicate from "effect/Predicate"
import * as Queue from "effect/Queue"
import * as Scope from "effect/Scope"
import * as Terminal from "effect/Terminal"
import * as readline from "node:readline"

/**
 * Creates a scoped process-backed `Terminal` using Node `readline`, enabling
 * TTY raw mode while in scope and using the supplied predicate to decide when
 * key input should end.
 *
 * @category constructors
 * @since 4.0.0
 */
export const make: (
  shouldQuit?: (input: Terminal.UserInput) => boolean
) => Effect.Effect<Terminal.Terminal, never, Scope.Scope> = Effect.fnUntraced(
  function*(shouldQuit: (input: Terminal.UserInput) => boolean = defaultShouldQuit) {
    const stdin = process.stdin
    const stdout = process.stdout
    const scope = yield* Effect.scope

    // stdin "end" fires once per process, so remember end-of-input for readers
    // created after the event (Bun never sets `readableEnded`).
    let inputEnded = stdin.readableEnded
    const onStdinEnd = () => {
      inputEnded = true
    }
    stdin.once("end", onStdinEnd)
    yield* Effect.addFinalizer(() => Effect.sync(() => stdin.off("end", onStdinEnd)))

    const getLines = yield* Effect.cached(
      Effect.gen(function*() {
        const lines = yield* Queue.make<string, Cause.Done>()
        if (inputEnded) {
          Queue.endUnsafe(lines)
          return lines
        }

        // Keep one readline interface so lines consumed together remain available.
        yield* Scope.provide(
          Effect.acquireRelease(
            Effect.sync(() => {
              const rl = readline.createInterface({ input: stdin, escapeCodeTimeout: 50 })
              readline.emitKeypressEvents(stdin, rl)
              rl.on("line", (line) => Queue.offerUnsafe(lines, line))
              rl.once("close", () => Queue.endUnsafe(lines))

              if (stdin.isTTY) {
                stdin.setRawMode(true)
              }
              return rl
            }),
            (rl) =>
              Effect.sync(() => {
                if (stdin.isTTY) {
                  stdin.setRawMode(false)
                }
                rl.close()
              })
          ),
          scope
        )

        return lines
      })
    )

    const columns = Effect.sync(() => stdout.columns ?? 0)
    const rows = Effect.sync(() => stdout.rows ?? 0)

    const readInput = Effect.gen(function*() {
      yield* getLines
      const queue = yield* Queue.make<Terminal.UserInput, Cause.Done>()
      const handleKeypress = (s: string | undefined, k: readline.Key) => {
        const userInput = {
          input: Option.fromUndefinedOr(s),
          key: { name: k.name ?? "", ctrl: !!k.ctrl, meta: !!k.meta, shift: !!k.shift }
        }
        Queue.offerUnsafe(queue, userInput)
        if (shouldQuit(userInput)) {
          Queue.endUnsafe(queue)
        }
      }
      // Without this, consumers (e.g. `Prompt.run`) hang forever on closed stdin.
      const handleEnd = () => {
        Queue.endUnsafe(queue)
      }
      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          stdin.off("keypress", handleKeypress)
          stdin.off("end", handleEnd)
        })
      )
      stdin.on("keypress", handleKeypress)
      if (inputEnded) {
        handleEnd()
      } else {
        stdin.once("end", handleEnd)
      }
      return queue as Queue.Dequeue<Terminal.UserInput, Cause.Done>
    })

    const readLine = Effect.flatMap(getLines, Queue.take).pipe(
      Effect.mapError(() => new Terminal.QuitError({}))
    )

    const display = (prompt: string) =>
      Effect.uninterruptible(
        Effect.callback<void, PlatformError>((resume) => {
          stdout.write(prompt, (err) =>
            Predicate.isNullish(err)
              ? resume(Effect.void)
              : resume(Effect.fail(
                badArgument({
                  module: "Terminal",
                  method: "display",
                  description: "Failed to write prompt to stdout",
                  cause: err
                })
              )))
        })
      )

    return Terminal.make({
      columns,
      rows,
      readInput,
      readLine,
      display
    })
  }
)

/**
 * Provides the default process-backed `Terminal` service, ending key input on
 * Ctrl+C or Ctrl+D.
 *
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<Terminal.Terminal> = Layer.effect(Terminal.Terminal, make(defaultShouldQuit))

function defaultShouldQuit(input: Terminal.UserInput) {
  return input.key.ctrl && (input.key.name === "c" || input.key.name === "d")
}
