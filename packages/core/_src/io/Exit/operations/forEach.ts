/**
 * Applies the function `f` to the successful result of the `Exit` and returns
 * the result in a new `Exit`.
 *
 * @tsplus static effect/core/io/Exit.Aspects forEach
 * @tsplus pipeable effect/core/io/Exit forEach
 */
export function forEach<A, R, E1, B>(
  f: (a: A) => Effect<R, E1, B>
) {
  return <E>(self: Exit<E, A>): Effect<R, never, Exit<E | E1, B>> => {
    switch (self._tag) {
      case "Failure":
        return Effect.succeed(Exit.failCause(self.cause))
      case "Success":
        return f(self.value).exit
    }
  }
}
