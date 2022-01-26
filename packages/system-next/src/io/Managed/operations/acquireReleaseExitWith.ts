import * as Tp from "../../../collection/immutable/Tuple"
import type { UIO } from "../../Effect"
import { Effect } from "../../Effect"
import type { Exit } from "../../Exit/definition"
import { currentEnvironment, currentReleaseMap } from "../../FiberRef/definition/data"
import { get } from "../../FiberRef/operations/get"
import { locally_ } from "../../FiberRef/operations/locally"
import { Managed } from "../definition"

/**
 * Lifts an `Effect<R, E, A>` into `Managed<R, E, A>` with a release action that
 * handles `Exit`. The acquire and release actions will be performed
 * uninterruptibly.
 *
 * @ets static ets/ManagedOps acquireReleaseExitWith
 */
export function acquireReleaseExitWith_<R, R1, E, A>(
  acquire: Effect<R, E, A>,
  release: (a: A, exit: Exit<any, any>) => Effect<R1, never, any>,
  __etsTrace?: string
): Managed<R & R1, E, A> {
  return Managed(
    Effect.environment<R1>()
      .flatMap((r) =>
        get(currentReleaseMap.value).flatMap((releaseMap) =>
          acquire.flatMap((a) =>
            releaseMap
              .add((ex) =>
                locally_(currentEnvironment.value, r)(release(a, ex) as UIO<any>)
              )
              .map((releaseMapEntry) => Tp.tuple(releaseMapEntry, a))
          )
        )
      )
      .uninterruptible()
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
  __etsTrace?: string
) {
  return <R, E>(acquire: Effect<R, E, A>): Managed<R & R1, E, A> =>
    acquireReleaseExitWith_(acquire, release)
}
