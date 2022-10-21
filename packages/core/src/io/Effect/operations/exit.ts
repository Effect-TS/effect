/**
 * Returns an effect that semantically runs the effect on a fiber, producing
 * an `Exit` for the completion value of the fiber.
 *
 * @tsplus getter effect/core/io/Effect exit
 */
export function exit<R, E, A>(self: Effect<R, E, A>) {
  return self.foldCause(
    (cause) => Exit.failCause(cause),
    (success) => Exit.succeed(success)
  )
}
