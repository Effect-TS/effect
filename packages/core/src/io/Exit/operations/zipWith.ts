/**
 * Zips this together with the specified result using the combination
 * functions.
 *
 * @tsplus static effect/core/io/Exit.Aspects zipWith
 * @tsplus pipeable effect/core/io/Exit zipWith
 * @category zipping
 * @since 1.0.0
 */
export function zipWith<E, E1, A, B, C>(
  that: Exit<E1, B>,
  f: (a: A, b: B) => C,
  g: (e: Cause<E>, e1: Cause<E1>) => Cause<E | E1>
) {
  return (self: Exit<E, A>): Exit<E | E1, C> => {
    switch (self._tag) {
      case "Failure": {
        switch (that._tag) {
          case "Success": {
            return self
          }
          case "Failure": {
            return Exit.failCause(g(self.cause, that.cause))
          }
        }
      }
      case "Success": {
        switch (that._tag) {
          case "Success": {
            return Exit.succeed(f(self.value, that.value))
          }
          case "Failure": {
            return that
          }
        }
      }
    }
  }
}
