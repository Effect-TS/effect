import { DeferredInternal } from "@effect/core/io/Deferred/operations/_internal/DeferredInternal"
import { DeferredState } from "@effect/core/io/Deferred/operations/_internal/DeferredState"

/**
 * Unsafely makes a new `Deferred`.
 *
 * @tsplus static ets/Deferred/Ops unsafeMake
 */
export function unsafeMake<E, A>(fiberId: FiberId): Deferred<E, A> {
  return new DeferredInternal(new AtomicReference(DeferredState.pending([])), fiberId)
}
