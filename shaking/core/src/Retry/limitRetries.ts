import * as O from "../Option"

import type { RetryPolicy } from "./RetryPolicy"

/**
 * Retry immediately, but only up to `i` times.
 *
 * @since 0.1.0
 */
export function limitRetries(i: number): RetryPolicy {
  return (status) => (status.iterNumber >= i ? O.none : O.some(0))
}
