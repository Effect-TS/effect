// ets_tracing: off

import * as Tp from "../../Collections/Immutable/Tuple"
import { currentReleaseMap } from "../../FiberRef/definition/concrete"
import { get } from "../../FiberRef/operations/get"
import type { Managed } from "../definition"
import { managedApply } from "../definition"
import { add_ } from "../ReleaseMap/add"
import * as T from "./_internal/effect"

/**
 * Preallocates the managed resource inside an outer managed, resulting in a
 * ZManaged that reserves and acquires immediately and cannot fail.
 */
export function preallocateManaged<R, E, A>(
  self: Managed<R, E, A>,
  __trace?: string
): Managed<R, E, Managed<unknown, never, A>> {
  return managedApply(
    T.map_(
      self.effect,
      ({ tuple: [release, a] }) =>
        Tp.tuple(
          release,
          managedApply(
            T.chain_(get(currentReleaseMap.value), (releaseMap) =>
              T.map_(add_(releaseMap, release), (_) => Tp.tuple(_, a))
            )
          )
        ),
      __trace
    )
  )
}
