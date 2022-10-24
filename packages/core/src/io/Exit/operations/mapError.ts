/**
 * Maps over the error type.
 *
 * @tsplus static effect/core/io/Exit.Aspects mapError
 * @tsplus pipeable effect/core/io/Exit mapError
 * @category mapping
 * @since 1.0.0
 */
export function mapError<E, E1>(f: (e: E) => E1) {
  return <A>(self: Exit<E, A>): Exit<E1, A> => {
    switch (self._tag) {
      case "Failure":
        return Exit.failCause(self.cause.map(f))
      case "Success":
        return self
    }
  }
}
