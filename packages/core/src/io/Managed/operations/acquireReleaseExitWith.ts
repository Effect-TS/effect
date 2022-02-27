import { Tuple } from "../../../collection/immutable/Tuple"
import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../Effect"
import type { Exit } from "../../Exit/definition"
import { FiberRef } from "../../FiberRef"
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
      .bind("releaseMap", () => FiberRef.currentReleaseMap.value.get())
      .bind("a", () => acquire())
      .bind("releaseMapEntry", ({ a, r, releaseMap }) =>
        releaseMap.add((ex) => release(a, ex).provideEnvironment(r))
      )
      .map(({ a, releaseMapEntry }) => Tuple(releaseMapEntry, a))
      .uninterruptible()
  )
}
