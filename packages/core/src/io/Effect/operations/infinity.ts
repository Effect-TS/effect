import type { HasClock } from "../../Clock"
import type { RIO } from "../definition"
import { Effect } from "../definition"

// `setTimeout` is limited to take delays which are 32-bit values
const MAX_SET_TIMEOUT_VALUE = 2 ** 31 - 1

/**
 * Like `never`, but fibers that running this effect won't be garbage
 * collected unless interrupted.
 *
 * @tsplus static ets/EffectOps infinity
 */
export const infinity: RIO<HasClock, never> =
  Effect.sleep(MAX_SET_TIMEOUT_VALUE) > Effect.never
