import * as Tp from "../../Collections/Immutable/Tuple"
import { currentEnvironment, currentReleaseMap } from "../../FiberRef/definition/data"
import { get } from "../../FiberRef/operations/get"
import { locally_ } from "../../FiberRef/operations/locally"
import type { Managed } from "../../Managed/definition"
import { managedApply } from "../../Managed/definition"
import { add_ } from "../../Managed/ReleaseMap/add"
import type { Fiber } from "../definition"
import * as T from "./_internal/effect"
import { interrupt } from "./interrupt"

/**
 * Converts this fiber into a `Managed`. The fiber is interrupted on release.
 */
export function toManaged<E, A>(
  self: Fiber<E, A>,
  __trace?: string
): Managed<unknown, never, Fiber<E, A>> {
  return managedApply(
    T.uninterruptible(
      T.chain_(T.environment<unknown>(), (r) =>
        T.chain_(get(currentReleaseMap.value), (releaseMap) =>
          T.chain_(T.succeedNow(self), (a) =>
            T.map_(
              add_(releaseMap, () =>
                locally_(
                  currentEnvironment.value,
                  r,
                  interrupt(a) as T.UIO<any>,
                  __trace
                )
              ),
              (releaseMapEntry) => Tp.tuple(releaseMapEntry, a)
            )
          )
        )
      )
    )
  )
}
