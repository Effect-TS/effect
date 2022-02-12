import type { HasClock } from "../../Clock"
import type { RIO } from "../definition"
import { Effect } from "../definition"

/**
 * Like `never`, but fibers that running this effect won't be garbage
 * collected unless interrupted.
 *
 * @tsplus static ets/Effect infinity
 */
export const infinity: RIO<HasClock, never> =
  Effect.sleep(Number.MAX_SAFE_INTEGER) > Effect.never
