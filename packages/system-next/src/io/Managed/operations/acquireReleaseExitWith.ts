import * as Tp from "../../../collection/immutable/Tuple"
import type { Effect, UIO } from "../../Effect/definition/base"
import { chain_ } from "../../Effect/operations/chain"
import { environment } from "../../Effect/operations/environment"
import { uninterruptible } from "../../Effect/operations/interruption"
import { map_ } from "../../Effect/operations/map"
import type { Exit } from "../../Exit/definition"
import {
  currentEnvironment,
  currentReleaseMap
} from "../../FiberRef/definition/data"
import { get } from "../../FiberRef/operations/get"
import { locally_ } from "../../FiberRef/operations/locally"
import type { Managed } from "../definition"
import { managedApply } from "../definition"
import { add_ } from "../ReleaseMap/add"

/**
 * Lifts an `Effect<R, E, A>` into `Managed<R, E, A>` with a release action that
 * handles `Exit`. The acquire and release actions will be performed
 * uninterruptibly.
 */
export function acquireReleaseExitWith_<R, R1, E, A>(
  acquire: Effect<R, E, A>,
  release: (a: A, exit: Exit<any, any>) => Effect<R1, never, any>,
  __trace?: string
): Managed<R & R1, E, A> {
  return managedApply(
    uninterruptible(
      chain_(environment<R1>(), (r) =>
        chain_(get(currentReleaseMap.value), (releaseMap) =>
          chain_(acquire, (a) =>
            map_(
              add_(releaseMap, (ex) =>
                locally_(
                  currentEnvironment.value,
                  r,
                  __trace
                )(release(a, ex) as UIO<any>)
              ),
              (releaseMapEntry) => Tp.tuple(releaseMapEntry, a)
            )
          )
        )
      )
    )
  )
}

/**
 * Lifts an `Effect<R, E, A>` into `Managed<R, E, A>` with a release action that
 * handles `Exit`. The acquire and release actions will be performed
 * uninterruptibly.
 *
 * @ets_data_first acquireReleaseExitWith
 */
export function acquireReleaseExitWith<A, R1>(
  release: (a: A, exit: Exit<any, any>) => Effect<R1, never, any>,
  __trace?: string
) {
  return <R, E>(acquire: Effect<R, E, A>): Managed<R & R1, E, A> =>
    acquireReleaseExitWith_(acquire, release, __trace)
}
