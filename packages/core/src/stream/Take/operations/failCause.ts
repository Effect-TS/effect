import { Option } from "../../../data/Option"
import type { Cause } from "../../../io/Cause"
import { Exit } from "../../../io/Exit"
import type { Take } from "../definition"
import { TakeInternal } from "./_internal/TakeInternal"

/**
 * Creates a failing `Take<E, never>` with the specified cause.
 *
 * @tsplus static ets/TakeOps failCause
 */
export function failCause<E>(cause: Cause<E>): Take<E, never> {
  return new TakeInternal(Exit.failCause(cause.map(Option.some)))
}
