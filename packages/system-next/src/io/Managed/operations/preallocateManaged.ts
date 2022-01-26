import * as Tp from "../../../collection/immutable/Tuple"
import { currentReleaseMap } from "../../FiberRef/definition/data"
import { get as fiberRefGet } from "../../FiberRef/operations/get"
import { Managed } from "../definition"

/**
 * Preallocates the managed resource inside an outer managed, resulting in a
 * `Managed` that reserves and acquires immediately and cannot fail.
 *
 * @ets fluent ets/Managed preallocateManaged
 */
export function preallocateManaged<R, E, A>(
  self: Managed<R, E, A>,
  __etsTrace?: string
): Managed<R, E, Managed<unknown, never, A>> {
  return Managed(
    self.effect.map(({ tuple: [release, a] }) =>
      Tp.tuple(
        release,
        Managed(
          fiberRefGet(currentReleaseMap.value).flatMap((releaseMap) =>
            releaseMap.add(release).map((_) => Tp.tuple(_, a))
          )
        )
      )
    )
  )
}
