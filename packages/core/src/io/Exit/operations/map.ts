/**
 * Maps over the value type.
 *
 * @tsplus static effect/core/io/Exit.Aspects map
 * @tsplus pipeable effect/core/io/Exit map
 * @category mapping
 * @since 1.0.0
 */
export function map<A, B>(f: (a: A) => B) {
  return <E>(self: Exit<E, A>): Exit<E, B> => {
    switch (self._tag) {
      case "Failure":
        return self
      case "Success":
        return Exit.succeed(f(self.value))
    }
  }
}
