import { Failure } from "@effect/core/io/Exit/definition"

/**
 * Maps over the cause type.
 *
 * @tsplus static effect/core/io/Exit.Aspects mapErrorCause
 * @tsplus pipeable effect/core/io/Exit mapErrorCause
 */
export function mapErrorCause<E, E1>(f: (cause: Cause<E>) => Cause<E1>) {
  return <A>(self: Exit<E, A>): Exit<E1, A> => {
    switch (self._tag) {
      case "Failure":
        return new Failure(f(self.cause))
      case "Success":
        return self
    }
  }
}
