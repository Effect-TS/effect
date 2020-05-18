import * as O from "../Option"

import { RetryPolicy } from "./RetryPolicy"

/**
 * Retry immediately, but only up to `i` times.
 */
export function limitRetries(i: number): RetryPolicy {
  return (status) => (status.iterNumber >= i ? O.none : O.some(0))
}
