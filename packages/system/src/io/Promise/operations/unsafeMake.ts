import { AtomicReference } from "../../../support/AtomicReference"
import type { FiberId } from "../../FiberId"
import { PromiseInternal } from "../_internal/promise"
import { PromiseState } from "../_internal/state"
import type { Promise } from "../definition"

/**
 * Unsafely makes a new promise.
 *
 * @tsplus static ets/PromiseOps unsafeMake
 */
export function unsafeMake<E, A>(fiberId: FiberId): Promise<E, A> {
  return new PromiseInternal(new AtomicReference(PromiseState.pending([])), fiberId)
}
