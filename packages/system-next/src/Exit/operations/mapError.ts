// ets_tracing: off

// TODO: implementation
import { map_ } from "../../Cause"
import type { Exit } from "../definition"
import { failCause } from "./failCause"

/**
 * Maps over the error type.
 */
export function mapError_<E, A, E1>(self: Exit<E, A>, f: (e: E) => E1): Exit<E1, A> {
  switch (self._tag) {
    case "Failure":
      return failCause(map_(self.cause, f))
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
  return <A>(self: Exit<E, A>): Exit<E1, A> => mapError_(self, f)
}
