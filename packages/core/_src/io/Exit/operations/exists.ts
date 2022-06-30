/**
 * @tsplus static effect/core/io/Exit.Aspects exists
 * @tsplus pipeable effect/core/io/Exit exists
 */
export function exists<A>(f: Predicate<A>) {
  return <E>(self: Exit<E, A>): boolean => {
    switch (self._tag) {
      case "Failure":
        return false
      case "Success":
        return f(self.value)
    }
  }
}
