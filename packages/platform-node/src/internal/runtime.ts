import { defaultTeardown, type RunMain } from "@effect/platform/Runtime"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import type * as FiberId from "effect/FiberId"

/** @internal */
export const runMain: RunMain = <E, A>(
  effect: Effect.Effect<never, E, A>,
  teardown = defaultTeardown
) => {
  const fiber = Effect.runFork(effect)

  fiber.addObserver((exit) =>
    teardown(exit, (code) => {
      Effect.runCallback(interruptAll(fiber.id()), () => {
        process.exit(code)
      })
    })
  )

  function onSigint() {
    process.removeListener("SIGINT", onSigint)
    process.removeListener("SIGTERM", onSigint)
    Effect.runFork(fiber.interruptAsFork(fiber.id()))
  }

  process.once("SIGINT", onSigint)
  process.once("SIGTERM", onSigint)
}

const interruptAll = (id: FiberId.FiberId) =>
  Effect.flatMap(Fiber.roots, (roots) => {
    if (roots.length === 0) {
      return Effect.unit
    }

    return Fiber.interruptAllAs(roots, id)
  })
