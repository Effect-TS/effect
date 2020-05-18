import * as O from "../Option"

import { RetryPolicy } from "./RetryPolicy"
import { RetryStatus } from "./RetryStatus"

/**
 * Apply policy on status to see what the decision would be.
 */
export function applyPolicy(policy: RetryPolicy, status: RetryStatus): RetryStatus {
  const previousDelay = policy(status)
  return {
    iterNumber: status.iterNumber + 1,
    cumulativeDelay: status.cumulativeDelay + O.getOrElse(() => 0)(previousDelay),
    previousDelay
  }
}
