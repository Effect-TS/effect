import { sleep as clockSleep } from "../Clock/core"

/**
 * Sleeps for `ms` milliseconds
 */
export function sleep(ms: number) {
  return clockSleep(ms)
}
