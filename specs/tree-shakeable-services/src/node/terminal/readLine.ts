import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as readline from "node:readline"
import * as Terminal from "../../Terminal.ts"

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
