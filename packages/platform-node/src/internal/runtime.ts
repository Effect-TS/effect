import { defaultTeardown, type RunMain } from "@effect/platform/Runtime"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import { equals } from "effect/Equal"
import * as Fiber from "effect/Fiber"
import type * as FiberId from "effect/FiberId"

/** @internal */
export const runMain: RunMain = <E, A>(
  effect: Effect.Effect<never, E, A>,
  teardown = defaultTeardown
) => {
  const fiber = Effect.runFork(
    Effect.tapErrorCause(effect, (cause) => {
      if (Cause.isInterruptedOnly(cause)) {
        return Effect.unit
      }
      return Effect.logError(cause)
    })
  )

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

const rootWithoutSelf = Effect.fiberIdWith((selfId) =>
  Effect.map(Fiber.roots, (roots) => roots.filter((fiber) => !equals(fiber.id(), selfId)))
)

const interruptAll = (id: FiberId.FiberId): Effect.Effect<never, never, void> =>
  Effect.flatMap(rootWithoutSelf, (roots) => {
    if (roots.length === 0) {
      return Effect.unit
    }
    return Effect.flatMap(
      Fiber.interruptAllAs(roots, id),
      () =>
        Effect.flatMap(
          rootWithoutSelf,
          (postInterruptRoots) => postInterruptRoots.length > 0 ? interruptAll(id) : Effect.unit
        )
    )
  })
