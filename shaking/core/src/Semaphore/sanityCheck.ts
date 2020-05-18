import * as T from "../Effect"

export function sanityCheck(n: number): T.Sync<void> {
  if (n < 0) {
    return T.raiseAbort(new Error("Die: semaphore permits must be non negative"))
  }
  if (Math.round(n) !== n) {
    return T.raiseAbort(new Error("Die: semaphore permits may not be fractional"))
  }
  return T.unit
}
