import { Exit } from "../definition"

/**
 * Maps over the error type.
 *
 * @tsplus fluent ets/Exit mapError
 */
export function mapError_<E, A, E1>(self: Exit<E, A>, f: (e: E) => E1): Exit<E1, A> {
  switch (self._tag) {
    case "Failure":
      return Exit.failCause(self.cause.map(f))
    case "Success":
      return self
  }
}

/**
 * Maps over the error type.
 *
 * @ets_data_first mapError_
 */
export function mapError<E, E1>(f: (e: E) => E1) {
  return <A>(self: Exit<E, A>): Exit<E1, A> => self.mapError(f)
}
