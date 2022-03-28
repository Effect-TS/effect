import { Option } from "../../../data/Option"
import type { IO } from "../../../io/Effect"
import { Effect } from "../../../io/Effect"

/**
 * @tsplus static ets/PullOps end
 */
export const end: IO<Option<never>, never> = Effect.fail(Option.none)
