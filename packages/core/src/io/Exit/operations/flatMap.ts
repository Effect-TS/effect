/**
 * Flat maps over the value type.
 *
 * @tsplus static effect/core/io/Exit.Aspects flatMap
 * @tsplus pipeable effect/core/io/Exit flatMap
 */
export function flatMap<A, E1, A1>(f: (a: A) => Exit<E1, A1>) {
  return <E>(self: Exit<E, A>): Exit<E | E1, A1> => {
    switch (self._tag) {
      case "Failure":
        return self
      case "Success":
        return f(self.value)
    }
  }
}
