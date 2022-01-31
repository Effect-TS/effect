import type { LazyArg } from "../../../data/Function"
import type { Ref } from "../../Ref"
import { get as refGet } from "../../Ref/operations/get"
import { make as refMake } from "../../Ref/operations/make"
import { Managed } from "../definition"
import type { Finalizer } from "../ReleaseMap/finalizer"

/**
 * Creates an effect that executes a finalizer stored in a `Ref`. The `Ref`
 * is yielded as the result of the effect, allowing for control flows that
 * require mutating finalizers.
 *
 * @ets static ets/ManagedOps finalizerRef
 */
export function finalizerRef<R>(
  initial: LazyArg<Finalizer>,
  __etsTrace?: string
): Managed<R, never, Ref<Finalizer>> {
  return Managed.acquireReleaseExitWith(refMake<Finalizer>(initial()), (ref, exit) =>
    refGet(ref).flatMap((fin) => fin(exit))
  )
}
