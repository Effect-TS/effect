import { Tuple } from "../../../collection/immutable/Tuple"
import { Effect } from "../../Effect"
import { currentEnvironment, currentReleaseMap } from "../../FiberRef/definition/data"
import { get } from "../../FiberRef/operations/get"
import { locally_ } from "../../FiberRef/operations/locally"
import { Managed } from "../../Managed/definition"
import type { Fiber } from "../definition"
import { interrupt } from "./interrupt"

/**
 * Converts this fiber into a `Managed`. The fiber is interrupted on release.
 */
export function toManaged<E, A>(
  self: Fiber<E, A>,
  __etsTrace?: string
): Managed<unknown, never, Fiber<E, A>> {
  return Managed(
    Effect.environment<unknown>()
      .flatMap((r) =>
        get(currentReleaseMap.value).flatMap((releaseMap) =>
          Effect.succeedNow(self).flatMap((a) =>
            releaseMap
              .add(() => locally_(currentEnvironment.value, r)(interrupt(a)))
              .map((releaseMapEntry) => Tuple(releaseMapEntry, a))
          )
        )
      )
      .uninterruptible()
  )
}
