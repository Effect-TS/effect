import { IFold } from "@effect/core/io/Effect/definition/primitives"

/**
 * Returns an effect that semantically runs the effect on a fiber, producing
 * an `Exit` for the completion value of the fiber.
 *
 * @tsplus getter effect/core/io/Effect exit
 */
export function exit<R, E, A>(self: Effect<R, E, A>): Effect<R, never, Exit<E, A>> {
  return new IFold(
    self,
    (cause) => Effect.succeed(Exit.failCause(cause)),
    (success) => Effect.succeed(Exit.succeed(success))
  )
}
