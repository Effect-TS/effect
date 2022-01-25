import type { LazyArg } from "../../../data/Function"
import type { IO } from "../definition"
import { failNow } from "./failNow"
import { succeed } from "./succeed"
import { suspendSucceed } from "./suspendSucceed"

/**
 * Imports a synchronous side-effect into a pure value, translating any
 * thrown exceptions into typed failed effects.
 *
 * @ets static ets/EffectOps tryCatch
 */
export function tryCatch<E, A>(
  attempt: LazyArg<A>,
  onThrow: (u: unknown) => E,
  __etsTrace?: string
): IO<E, A> {
  return suspendSucceed(() => {
    try {
      return succeed(attempt)
    } catch (error) {
      return failNow(onThrow(error))
    }
  }, __etsTrace)
}
