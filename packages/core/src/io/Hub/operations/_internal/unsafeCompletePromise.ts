import { Effect } from "../../../Effect"
import type { Promise } from "../../../Promise"

/**
 * Unsafely completes a promise with the specified value.
 */
export function unsafeCompletePromise<A>(promise: Promise<never, A>, a: A): void {
  promise.unsafeDone(Effect.succeedNow(a))
}
