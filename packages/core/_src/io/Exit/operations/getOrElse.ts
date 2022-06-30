/**
 * Retrieves the `A` if succeeded, or else returns the specified default `A`.
 *
 * @tsplus static effect/core/io/Exit.Aspects getOrElse
 * @tsplus pipeable effect/core/io/Exit getOrElse
 */
export function getOrElse<E, A>(orElse: (cause: Cause<E>) => A) {
  return (self: Exit<E, A>): A => {
    switch (self._tag) {
      case "Failure":
        return orElse(self.cause)
      case "Success":
        return self.value
    }
  }
}
