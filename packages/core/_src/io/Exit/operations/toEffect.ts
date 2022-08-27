/**
 * Converts the `Exit` to an `Effect`.
 *
 * @tsplus getter effect/core/io/Exit toEffect
 */
export function toEffect<E, A>(
  self: Exit<E, A>
): Effect<never, E, A> {
  switch (self._tag) {
    case "Failure":
      return Effect.failCause(self.cause)
    case "Success":
      return Effect.succeed(self.value)
  }
}
