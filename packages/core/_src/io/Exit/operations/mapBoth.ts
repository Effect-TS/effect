/**
 * Maps over both the error and value type.
 *
 * @tsplus static effect/core/io/Exit.Aspects mapBoth
 * @tsplus pipeable effect/core/io/Exit mapBoth
 */
export function mapBoth<E, A, E1, A1>(
  onFailure: (e: E) => E1,
  onSuccess: (a: A) => A1
) {
  return (self: Exit<E, A>): Exit<E1, A1> => {
    switch (self._tag) {
      case "Failure":
        return Exit.failCause(self.cause.map(onFailure))
      case "Success":
        return Exit.succeed(onSuccess(self.value))
    }
  }
}
