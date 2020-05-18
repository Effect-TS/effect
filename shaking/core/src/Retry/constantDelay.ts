import * as O from "../Option"

import { RetryPolicy } from "./RetryPolicy"

/**
 * Constant delay with unlimited retries
 */
export function constantDelay(delay: number): RetryPolicy {
  return () => O.some(delay)
}
