import { Option } from "../../../data/Option"
import type { USTM } from "../definition"
import { STM } from "../definition"

/**
 * Returns an effect with the empty value.
 *
 * @tsplus static ets/STMOps none
 */
export const succeedNone: USTM<Option<never>> = STM.succeed(Option.none)
