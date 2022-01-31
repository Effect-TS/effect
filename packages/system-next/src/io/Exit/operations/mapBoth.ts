// TODO: implementation
import type { Exit } from "../definition"
import { failCause } from "./failCause"
import { succeed } from "./succeed"

/**
 * Maps over both the error and value type.
 */
export function mapBoth_<E, A, E1, A1>(
  self: Exit<E, A>,
  onFailure: (e: E) => E1,
  onSuccess: (a: A) => A1
): Exit<E1, A1> {
  switch (self._tag) {
    case "Failure":
      return failCause(self.cause.map(onFailure))
    case "Success":
      return succeed(onSuccess(self.value))
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
  return (self: Exit<E, A>): Exit<E1, A1> => mapBoth_(self, onFailure, onSuccess)
}
