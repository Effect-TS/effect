import { Exit } from "../definition"

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
 * @ets_data_first mapBoth_
 */
export function mapBoth<E, E1, A, A1>(
  onFailure: (e: E) => E1,
  onSuccess: (a: A) => A1
) {
  return (self: Exit<E, A>): Exit<E1, A1> => self.mapBoth(onFailure, onSuccess)
}
