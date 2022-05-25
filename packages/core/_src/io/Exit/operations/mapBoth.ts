/**
 * Maps over both the error and value type.
 *
 * @tsplus fluent ets/Exit mapBoth
 */
export function mapBoth_<E, A, E1, A1>(
  self: Exit<E, A>,
  onFailure: (e: E) => E1,
  onSuccess: (a: A) => A1
): Exit<E1, A1> {
  switch (self._tag) {
    case "Failure":
      return Exit.failCause(self.cause.map(onFailure))
    case "Success":
      return Exit.succeed(onSuccess(self.value))
  }
}

/**
 * Maps over both the error and value type.
 *
 * @tsplus static ets/Exit/Aspects mapBoth
 */
export const mapBoth = Pipeable(mapBoth_)
