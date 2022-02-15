import { Effect } from "../../../Effect"
import type { Promise } from "../../../Promise"

export function unsafeCompletePromise<A>(promise: Promise<never, A>, a: A): void {
  return promise.unsafeDone(Effect.succeedNow(a))
}
