import type { RetryPolicy } from "./RetryPolicy"

/**
 * Grow delay exponentially each iteration.
 * Each delay will increase by a factor of two.
 *
 * @since 0.1.0
 */
export function exponentialBackoff(delay: number): RetryPolicy {
  return (status) => O.some(delay * Math.pow(2, status.iterNumber))
}
