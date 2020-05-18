import * as O from "../Option"

import { RetryPolicy } from "./RetryPolicy"

/**
 * Grow delay exponentially each iteration.
 * Each delay will increase by a factor of two.
 */
export function exponentialBackoff(delay: number): RetryPolicy {
  return (status) => O.some(delay * Math.pow(2, status.iterNumber))
}
