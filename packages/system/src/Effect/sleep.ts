// ets_tracing: off

import { sleep as clockSleep } from "../Clock/index.js"

/**
 * Sleeps for `ms` milliseconds
 */
export function sleep(ms: number, __trace?: string) {
  return clockSleep(ms, __trace)
}
