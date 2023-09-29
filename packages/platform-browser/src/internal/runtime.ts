import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import type * as FiberId from "effect/FiberId"

/** @internal */
export const runMain = <E, A>(
  effect: Effect.Effect<never, E, A>
) => {
  const fiber = Effect.runFork(effect)

  fiber.addObserver(() => {
    Effect.runFork(interruptAll(fiber.id()))
  })

  addEventListener("beforeunload", () => {
    Effect.runFork(fiber.interruptAsFork(fiber.id()))
  })
}

const interruptAll = (id: FiberId.FiberId) =>
  Effect.flatMap(
    Fiber.roots,
    (roots) => Fiber.interruptAllAs(roots, id)
  )
