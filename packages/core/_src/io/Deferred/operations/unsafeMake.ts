import { DeferredState } from "@effect/core/io/Deferred/_internal/DeferredState"
import { DeferredInternal } from "@effect/core/io/Deferred/definition"

/**
 * Unsafely makes a new `Deferred`.
 *
 * @tsplus static effect/core/io/Deferred.Ops unsafeMake
 */
export function unsafeMake<E, A>(fiberId: FiberId): Deferred<E, A> {
  return new DeferredInternal(new AtomicReference(DeferredState.pending([])), fiberId)
}
