import type { Option } from "../Option/Option"

import type { RetryStatus } from "./RetryStatus"

/**
 * A `RetryPolicy` is a function that takes an `RetryStatus` and
 * possibly returns a delay in milliseconds. Iteration numbers start
 * at zero and increase by one on each retry. A *None* return value from
 * the function implies we have reached the retry limit.
 *
 * @since 0.1.0
 */
export interface RetryPolicy {
  (status: RetryStatus): Option<number>
}
