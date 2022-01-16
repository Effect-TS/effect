// ets_tracing: off

import * as Tp from "../../Collections/Immutable/Tuple"
import { currentReleaseMap } from "../../FiberRef/definition/concrete"
import { get } from "../../FiberRef/operations/get"
import { locally_ } from "../../FiberRef/operations/locally"
import { pipe } from "../../Function"
import type { Managed } from "../definition"
import { managedApply } from "../definition"
import { releaseAll_ } from "../ReleaseMap"
import { add_ } from "../ReleaseMap/add"
import { make } from "../ReleaseMap/make"
import * as T from "./_internal/effect"
import * as Ex from "./_internal/exit"

/**
 * Preallocates the managed resource, resulting in a `Managed` that reserves
 * and acquires immediately and cannot fail. You should take care that you are
 * not interrupted between running preallocate and actually acquiring the
 * resource as you might leak otherwise.
 */
export function preallocate<R, E, A>(
  self: Managed<R, E, A>,
  __trace?: string
): T.Effect<R, E, Managed<unknown, never, A>> {
  return T.uninterruptibleMask((status) =>
    pipe(
      T.do,
      T.bind("releaseMap", () => make),
      T.bind("tp", ({ releaseMap }) =>
        T.exit(
          status.restore(
            locally_(currentReleaseMap.value, releaseMap, self.effect),
            __trace
          )
        )
      ),
      T.chain(({ releaseMap, tp }) =>
        Ex.foldEffect_(
          tp,
          (cause) =>
            T.chain_(releaseAll_(releaseMap, Ex.fail(cause), T.sequential), () =>
              T.failCause(cause)
            ),
          ({ tuple: [release, a] }) =>
            T.succeed(() =>
              managedApply<unknown, never, A>(
                T.chain_(get(currentReleaseMap.value), (releaseMap) =>
                  T.map_(add_(releaseMap, release), (_) => Tp.tuple(_, a))
                )
              )
            )
        )
      )
    )
  )
}
