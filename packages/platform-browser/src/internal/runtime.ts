import * as Effect from "@effect/io/Effect"
import * as Fiber from "@effect/io/Fiber"
import type * as FiberId from "@effect/io/FiberId"

/** @internal */
export const runMain = <E, A>(
  effect: Effect.Effect<never, E, A>
) => {
  const fiber = Effect.runFork(effect)

  fiber.unsafeAddObserver(() => {
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
