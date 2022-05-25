/**
 * Applies the function `f` to the successful result of the `Exit` and returns
 * the result in a new `Exit`.
 *
 * @tsplus fluent ets/Exit forEach
 */
export function forEach_<E, A, R, E1, B>(
  self: Exit<E, A>,
  f: (a: A) => Effect<R, E1, B>,
  __tsplusTrace?: string
): Effect<R, never, Exit<E | E1, B>> {
  switch (self._tag) {
    case "Failure":
      return Effect.succeed(Exit.failCause(self.cause))
    case "Success":
      return f(self.value).exit()
  }
}

/**
 * Applies the function `f` to the successful result of the `Exit` and returns
 * the result in a new `Exit`.
 *
 * @tsplus static ets/Exit/Aspects forEach
 */
export const forEach = Pipeable(forEach_)
