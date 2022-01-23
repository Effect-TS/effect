import { currentReleaseMap } from "../../FiberRef/definition/data"
import { get as fiberRefGet } from "../../FiberRef/operations/get"
import type { Managed } from "../definition"
import { managedApply } from "../definition"
import { updateAll } from "../ReleaseMap/updateAll"
import * as T from "./_internal/effect"

/**
 * Returns a new managed effect that ignores defects in finalizers.
 */
export function ignoreReleaseFailures<R, E, A>(
  self: Managed<R, E, A>,
  __trace?: string
): Managed<R, E, A> {
  return managedApply(
    T.zipRight_(
      T.tap_(
        fiberRefGet(currentReleaseMap.value),
        updateAll(
          (finalizer) => (exit) => T.catchAllCause_(finalizer(exit), () => T.unit)
        )
      ),
      self.effect
    )
  )
}
//  def ignoreReleaseFailures(implicit trace: ZTraceElement): ZManaged[R, E, A] =
//  ZManaged(
//    ZManaged.currentReleaseMap.value.get.tap(
//      _.updateAll(finalizer => exit => finalizer(exit).catchAllCause(_ => ZIO.unit))
//    ) *> zio
//  )
