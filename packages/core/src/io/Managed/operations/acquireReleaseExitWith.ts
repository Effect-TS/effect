import { Tuple } from "../../../collection/immutable/Tuple"
import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../Effect"
import type { Exit } from "../../Exit/definition"
import { currentReleaseMap } from "../../FiberRef/definition/data"
import { get as fiberRefGet } from "../../FiberRef/operations/get"
import { Managed } from "../definition"

/**
 * Lifts an `Effect<R, E, A>` into `Managed<R, E, A>` with a release action that
 * handles `Exit`. The acquire and release actions will be performed
 * uninterruptibly.
 *
 * @tsplus static ets/ManagedOps acquireReleaseExitWith
 */
export function acquireReleaseExitWith<R, R1, E, A>(
  acquire: LazyArg<Effect<R, E, A>>,
  release: (a: A, exit: Exit<any, any>) => Effect<R1, never, any>,
  __tsplusTrace?: string
): Managed<R & R1, E, A> {
  return Managed(
    Effect.Do()
      .bind("r", () => Effect.environment<R1>())
      .bind("releaseMap", () => fiberRefGet(currentReleaseMap.value))
      .bind("a", () => acquire())
      .bind("releaseMapEntry", ({ a, r, releaseMap }) =>
        releaseMap.add((ex) => release(a, ex).provideEnvironment(r))
      )
      .map(({ a, releaseMapEntry }) => Tuple(releaseMapEntry, a))
      .uninterruptible()
  )
}
