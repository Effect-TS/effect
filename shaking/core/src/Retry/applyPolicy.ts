import * as O from "../Option"

import type { RetryPolicy } from "./RetryPolicy"
import type { RetryStatus } from "./RetryStatus"

/**
 * Apply policy on status to see what the decision would be.
 *
 * @since 0.1.0
 */
export function applyPolicy(policy: RetryPolicy, status: RetryStatus): RetryStatus {
  const previousDelay = policy(status)
  return {
    iterNumber: status.iterNumber + 1,
    cumulativeDelay: status.cumulativeDelay + O.getOrElse(() => 0)(previousDelay),
    previousDelay
  }
}
