import { Tuple } from "../../../collection/immutable/Tuple"
import { Effect } from "../../Effect"
import { FiberRef } from "../../FiberRef"
import { Managed } from "../../Managed/definition"
import type { Fiber } from "../definition"

/**
 * Converts this fiber into a `Managed`. The fiber is interrupted on release.
 *
 * @tsplus fluent ets/Fiber toManaged
 * @tsplus fluent ets/RuntimeFiber toManaged
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
            Effect.succeedNow(self).flatMap((fiber) =>
              releaseMap
                .add(() =>
                  fiber.interrupt().apply(FiberRef.currentEnvironment.value.locally(r))
                )
                .map((releaseMapEntry) => Tuple(releaseMapEntry, fiber))
            )
          )
      )
      .uninterruptible()
  )
}
