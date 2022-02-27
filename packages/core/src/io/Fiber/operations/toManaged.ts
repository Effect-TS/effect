import { Tuple } from "../../../collection/immutable/Tuple"
import { Effect } from "../../Effect"
import { FiberRef } from "../../FiberRef"
import { Managed } from "../../Managed/definition"
import type { Fiber } from "../definition"
import { interrupt } from "./interrupt"

/**
 * Converts this fiber into a `Managed`. The fiber is interrupted on release.
 */
export function toManaged<E, A>(
  self: Fiber<E, A>,
  __tsplusTrace?: string
): Managed<unknown, never, Fiber<E, A>> {
  return Managed(
    Effect.environment<unknown>()
      .flatMap((r) =>
        FiberRef.currentReleaseMap.value
          .get()
          .flatMap((releaseMap) =>
            Effect.succeedNow(self).flatMap((a) =>
              releaseMap
                .add(() =>
                  interrupt(a).apply(FiberRef.currentEnvironment.value.locally(r))
                )
                .map((releaseMapEntry) => Tuple(releaseMapEntry, a))
            )
          )
      )
      .uninterruptible()
  )
}
