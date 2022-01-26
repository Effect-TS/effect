import * as Tp from "../../../collection/immutable/Tuple"
import type { UIO } from "../../Effect"
import { Effect } from "../../Effect"
import { currentEnvironment, currentReleaseMap } from "../../FiberRef/definition/data"
import { get } from "../../FiberRef/operations/get"
import { locally_ } from "../../FiberRef/operations/locally"
import type { Managed } from "../../Managed/definition"
import { managedApply } from "../../Managed/definition"
import { add_ } from "../../Managed/ReleaseMap/add"
import type { Fiber } from "../definition"
import { interrupt } from "./interrupt"

/**
 * Converts this fiber into a `Managed`. The fiber is interrupted on release.
 */
export function toManaged<E, A>(
  self: Fiber<E, A>,
  __trace?: string
): Managed<unknown, never, Fiber<E, A>> {
  return managedApply(
    Effect.environment<unknown>()
      .flatMap((r) =>
        get(currentReleaseMap.value).flatMap((releaseMap) =>
          Effect.succeedNow(self).flatMap((a) =>
            add_(releaseMap, () =>
              locally_(currentEnvironment.value, r, __trace)(interrupt(a) as UIO<any>)
            ).map((releaseMapEntry) => Tp.tuple(releaseMapEntry, a))
          )
        )
      )
      .uninterruptible()
  )
}
