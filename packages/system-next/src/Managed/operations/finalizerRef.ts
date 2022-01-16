// ets_tracing: off

import type { Managed } from ".."
import type { Finalizer } from "../ReleaseMap/finalizer"
import * as T from "./_internal/effect"
import * as Ref from "./_internal/ref"
import { acquireReleaseExitWith_ } from "./acquireReleaseExitWith"

/**
 * Creates an effect that executes a finalizer stored in a `Ref`. The `Ref`
 * is yielded as the result of the effect, allowing for control flows that
 * require mutating finalizers.
 */
export function finalizerRef<R>(
  initial: Finalizer,
  __trace?: string
): Managed<R, never, Ref.Ref<Finalizer>> {
  return acquireReleaseExitWith_(
    Ref.make<Finalizer>(initial),
    (ref, exit) => T.chain_(Ref.get(ref), (fin) => fin(exit)),
    __trace
  )
}
