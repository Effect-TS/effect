import { Option } from "../../../data/Option"
import type { IO } from "../../../io/Effect"
import { Effect } from "../../../io/Effect"

/**
 * @tsplus static ets/PullOps fail
 */
export function fail<E>(e: E): IO<Option<E>, never> {
  return Effect.fail(Option.some(e))
}
