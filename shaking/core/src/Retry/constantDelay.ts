import type { RetryPolicy } from "./RetryPolicy"

/**
 * Constant delay with unlimited retries
 *
 * @since 0.1.0
 */
export function constantDelay(delay: number): RetryPolicy {
  return () => O.some(delay)
}
