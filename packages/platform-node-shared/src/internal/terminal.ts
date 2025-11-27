import * as Error from "@effect/platform/Error"
import * as Terminal from "@effect/platform/Terminal"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as Mailbox from "effect/Mailbox"
import * as Option from "effect/Option"
import * as RcRef from "effect/RcRef"
import * as readline from "node:readline"

const defaultShouldQuit = (input: Terminal.UserInput) =>
  input.key.ctrl && (input.key.name === "c" || input.key.name === "d")

/** @internal */
export const make = Effect.fnUntraced(function*(
  shouldQuit: (input: Terminal.UserInput) => boolean = defaultShouldQuit
) {
  const stdin = process.stdin
  const stdout = process.stdout

  // Acquire readline interface with TTY setup/cleanup inside the scope
  const rlRef = yield* RcRef.make({
    acquire: Effect.acquireRelease(
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
  })

  const columns = Effect.sync(() => stdout.columns ?? 0)

  const readInput = Effect.gen(function*() {
    yield* RcRef.get(rlRef)
    const mailbox = yield* Mailbox.make<Terminal.UserInput>()
    const handleKeypress = (s: string | undefined, k: readline.Key) => {
      const userInput = {
        input: Option.fromNullable(s),
        key: { name: k.name ?? "", ctrl: !!k.ctrl, meta: !!k.meta, shift: !!k.shift }
      }
      mailbox.unsafeOffer(userInput)
      if (shouldQuit(userInput)) {
        mailbox.unsafeDone(Exit.void)
      }
    }
    yield* Effect.addFinalizer(() => Effect.sync(() => stdin.off("keypress", handleKeypress)))
    stdin.on("keypress", handleKeypress)
    return mailbox as Mailbox.ReadonlyMailbox<Terminal.UserInput>
  })

  const readLine = RcRef.get(rlRef).pipe(
    Effect.flatMap((readlineInterface) =>
      Effect.async<string, Terminal.QuitException>((resume) => {
        const onLine = (line: string) => resume(Effect.succeed(line))
        readlineInterface.once("line", onLine)
        return Effect.sync(() => readlineInterface.off("line", onLine))
      })
    ),
    Effect.scoped
  )

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
