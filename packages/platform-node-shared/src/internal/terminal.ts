import * as Error from "@effect/platform/Error"
import * as Terminal from "@effect/platform/Terminal"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Queue from "effect/Queue"
import * as readline from "node:readline"

const defaultShouldQuit = (input: Terminal.UserInput) =>
  input.key.ctrl && (input.key.name === "c" || input.key.name === "d")

/** @internal */
export const make = (
  shouldQuit: (input: Terminal.UserInput) => boolean = defaultShouldQuit
) =>
  Effect.gen(function*() {
    const stdin = yield* Effect.sync(() => process.stdin)
    const stdout = yield* Effect.sync(() => process.stdout)

    // Queue for keypresses + Quit sentinel
    const eventsQueue = yield* Queue.unbounded<Terminal.UserInput | Terminal.QuitException>()

    // Acquire readline interface with TTY setup/cleanup inside the scope
    const readlineInterface = yield* Effect.acquireRelease(
      Effect.sync(() => {
        const rl = readline.createInterface({ input: stdin, escapeCodeTimeout: 50 })
        readline.emitKeypressEvents(stdin, rl)

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
    )

    // Acquire keypress listener with cleanup inside the scope
    yield* Effect.acquireRelease(
      Effect.sync(() => {
        const handleKeypress = (s: string | undefined, k: readline.Key) => {
          const userInput = {
            input: Option.fromNullable(s),
            key: { name: k.name ?? "", ctrl: !!k.ctrl, meta: !!k.meta, shift: !!k.shift }
          }
          if (shouldQuit(userInput)) {
            eventsQueue.unsafeOffer(new Terminal.QuitException())
          } else {
            eventsQueue.unsafeOffer(userInput)
          }
        }
        stdin.on("keypress", handleKeypress)
        return handleKeypress
      }),
      (handleKeypress) => Effect.sync(() => stdin.off("keypress", handleKeypress))
    )

    const columns = Effect.sync(() => stdout.columns ?? 0)

    const readInput = Effect.flatMap(Queue.take(eventsQueue), (ev) =>
      ev instanceof Terminal.QuitException ? Effect.fail(ev) : Effect.succeed(ev))

    const readLine = Effect.async<string, Terminal.QuitException>((resume) => {
      const onLine = (line: string) =>
        resume(Effect.succeed(line))
      readlineInterface.on("line", onLine)
      return Effect.sync(() => readlineInterface.off("line", onLine))
    })

    const display = (prompt: string) =>
      Effect.uninterruptible(
        Effect.async<void, Error.PlatformError>((resume) => {
          stdout.write(prompt, (err) =>
            err
              ? resume(Effect.fail(
                new Error.BadArgument({
                  module: "Terminal",
                  method: "display",
                  description: "Failed to write prompt to stdout",
                  cause: err
                })
              ))
              : resume(Effect.void))
          return Effect.void
        })
      )

    return Terminal.Terminal.of({
      columns,
      readInput,
      readLine,
      display
    })
  })

/** @internal */
export const layer: Layer.Layer<Terminal.Terminal> = Layer.scoped(Terminal.Terminal, make(defaultShouldQuit))
