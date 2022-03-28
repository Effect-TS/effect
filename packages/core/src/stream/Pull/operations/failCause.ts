import { Option } from "../../../data/Option"
import type { Cause } from "../../../io/Cause"
import type { IO } from "../../../io/Effect"
import { Effect } from "../../../io/Effect"

/**
 * @tsplus static ets/PullOps failCause
 */
export function failCause<E>(cause: Cause<E>): IO<Option<E>, never> {
  return Effect.failCause(cause).mapError(Option.some)
}
