import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import * as readline from "node:readline"
import * as Terminal from "../../Terminal.ts"

/** The Node implementation of `Terminal.readInput`: key events from standard input until the scope closes. */
export const readInput = Layer.succeed(
  Terminal.readInput.service,
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
