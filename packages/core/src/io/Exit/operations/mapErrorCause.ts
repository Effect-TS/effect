/**
 * Maps over the cause type.
 *
 * @tsplus static effect/core/io/Exit.Aspects mapErrorCause
 * @tsplus pipeable effect/core/io/Exit mapErrorCause
 * @category mapping
 * @since 1.0.0
 */
export function mapErrorCause<E, E1>(f: (cause: Cause<E>) => Cause<E1>) {
  return <A>(self: Exit<E, A>): Exit<E1, A> => {
    switch (self._tag) {
      case "Failure":
        return Exit.failCause(f(self.cause))
      case "Success":
        return self
    }
  }
}
