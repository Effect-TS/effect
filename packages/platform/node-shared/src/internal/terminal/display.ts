import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { badArgument, type PlatformError } from "effect/PlatformError"
import * as Predicate from "effect/Predicate"
import * as Terminal from "effect/Terminal"

/** @internal */
export const display: Terminal.Shape["display"] = (prompt: string) =>
  Effect.uninterruptible(
    Effect.callback<void, PlatformError>((resume) => {
      process.stdout.write(prompt, (err) =>
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

/** @internal */
export const layer: Layer.Layer<"effect/Terminal/display"> = Layer.succeed(Terminal.display, display)
