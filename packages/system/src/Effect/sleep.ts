import { sleep as clockSleep } from "../Clock"
import { foldTraced_, traceF_ } from "../Tracing"
import { suspend } from "./core"

/**
 * Sleeps for `ms` milliseconds
 *
 * @module Effect
 * @trace replace 0
 */
export function sleep(ms: number) {
  return foldTraced_(ms, (d, t) => suspend(traceF_(() => clockSleep(d), t)))
}
