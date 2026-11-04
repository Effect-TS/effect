import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Terminal from "../../Terminal.ts"

/** The Node implementation of `Terminal.display`. */
export const display = Layer.succeed(
  Terminal.display.service,
  (text) =>
    Effect.callback<void, Terminal.TerminalError>((resume) => {
      process.stdout.write(text, (cause) =>
        resume(cause ? Effect.fail(new Terminal.TerminalError({ operation: "display", cause })) : Effect.void))
    })
)
