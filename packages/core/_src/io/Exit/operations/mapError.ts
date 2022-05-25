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
 * @tsplus static ets/Exit/Aspects mapError
 */
export const mapError = Pipeable(mapError_)
