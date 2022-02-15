import { Option } from "../../../data/Option"
import type { UIO } from "../definition"
import { Effect } from "../definition"

/**
 * Returns an effect with the empty value.
 *
 * @tsplus static ets/EffectOps none
 */
export const none: UIO<Option<never>> = Effect.succeed(() => Option.none)
