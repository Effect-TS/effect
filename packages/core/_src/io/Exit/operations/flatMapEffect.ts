/**
 * Effectually flat maps over the value type.
 *
 * @tsplus static effect/core/io/Exit.Aspects flatMapEffect
 * @tsplus pipeable effect/core/io/Exit flatMapEffect
 */
export function flatMapEffect<E, A, R, E1, A1>(
  f: (a: A) => Effect<R, E1, Exit<E, A1>>,
  __tsplusTrace?: string
) {
  return (self: Exit<E, A>): Effect<R, E1, Exit<E, A1>> => {
    switch (self._tag) {
      case "Failure":
        return Effect.succeed(self)
      case "Success":
        return f(self.value)
    }
  }
}
