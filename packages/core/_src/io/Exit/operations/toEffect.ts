/**
 * Converts the `Exit` to an `Effect`.
 *
 * @tsplus fluent ets/Exit toEffect
 */
export function toEffect<E, A>(
  self: Exit<E, A>,
  __tsplusTrace?: string
): Effect<never, E, A> {
  switch (self._tag) {
    case "Failure":
      return Effect.failCause(self.cause)
    case "Success":
      return Effect.succeed(self.value)
  }
}
