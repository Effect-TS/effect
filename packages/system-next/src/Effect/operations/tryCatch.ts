import type { IO } from "../definition"
import { failNow } from "./failNow"
import { succeed } from "./succeed"
import { suspendSucceed } from "./suspendSucceed"

/**
 * Imports a synchronous side-effect into a pure value, translating any
 * thrown exceptions into typed failed effects.
 */
export function tryCatch<E, A>(
  attempt: () => A,
  onThrow: (u: unknown) => E,
  __trace?: string
): IO<E, A> {
  return suspendSucceed(() => {
    try {
      return succeed(attempt)
    } catch (error) {
      return failNow(onThrow(error))
    }
  }, __trace)
}
