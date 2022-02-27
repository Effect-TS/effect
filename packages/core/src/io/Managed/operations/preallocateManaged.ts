import { Tuple } from "../../../collection/immutable/Tuple"
import { FiberRef } from "../../FiberRef"
import { Managed } from "../definition"

/**
 * Preallocates the managed resource inside an outer managed, resulting in a
 * `Managed` that reserves and acquires immediately and cannot fail.
 *
 * @tsplus fluent ets/Managed preallocateManaged
 */
export function preallocateManaged<R, E, A>(
  self: Managed<R, E, A>,
  __tsplusTrace?: string
): Managed<R, E, Managed<unknown, never, A>> {
  return Managed(
    self.effect.map(({ tuple: [release, a] }) =>
      Tuple(
        release,
        Managed(
          FiberRef.currentReleaseMap.value
            .get()
            .flatMap((releaseMap) => releaseMap.add(release).map((_) => Tuple(_, a)))
        )
      )
    )
  )
}
