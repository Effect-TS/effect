import { Tuple } from "../../../collection/immutable/Tuple"
import { Effect } from "../../Effect"
import { ExecutionStrategy } from "../../ExecutionStrategy"
import type { Exit } from "../../Exit"
import { currentReleaseMap } from "../../FiberRef/definition/data"
import { get } from "../../FiberRef/operations/get"
import { locally_ } from "../../FiberRef/operations/locally"
import { Managed } from "../definition"
import { ReleaseMap } from "../ReleaseMap"

/**
 * Ensures that a cleanup function runs when this `Managed` is finalized and
 * before the existing finalizers.
 *
 * @tsplus fluent ets/Managed onExitFirst
 */
export function onExitFirst_<R, E, A, R1, X>(
  self: Managed<R, E, A>,
  cleanup: (exit: Exit<E, A>) => Effect<R1, never, X>,
  __tsplusTrace?: string
): Managed<R & R1, E, A> {
  return Managed(
    Effect.uninterruptibleMask(({ restore }) =>
      Effect.Do()
        .bind("r1", () => Effect.environment<R1>())
        .bind("outerReleaseMap", () => get(currentReleaseMap.value))
        .bind("innerReleaseMap", () => ReleaseMap.make)
        .bind("exitEA", ({ innerReleaseMap }) =>
          locally_(
            currentReleaseMap.value,
            innerReleaseMap
          )(
            restore(self.effect)
              .exit()
              .map((e) => e.map((_) => _.get(1)))
          )
        )
        .bind("releaseMapEntry", ({ exitEA, innerReleaseMap, outerReleaseMap, r1 }) =>
          outerReleaseMap.add((e) =>
            cleanup(exitEA)
              .provideEnvironment(r1)
              .exit()
              .zipWith(
                innerReleaseMap.releaseAll(e, ExecutionStrategy.Sequential).exit(),
                (l, r) => Effect.done(l.zipRight(r))
              )
              .flatten()
          )
        )
        .bind("a", ({ exitEA }) => Effect.done(exitEA))
        .map(({ a, releaseMapEntry }) => Tuple(releaseMapEntry, a))
    )
  )
}

/**
 * Ensures that a cleanup function runs when this `Managed` is finalized and
 * before the existing finalizers.
 *
 * @ets_data_first onExitFirst_
 */
export function onExitFirst<E, A, R1, X>(
  cleanup: (exit: Exit<E, A>) => Effect<R1, never, X>,
  __tsplusTrace?: string
) {
  return <R>(self: Managed<R, E, A>): Managed<R & R1, E, A> => self.onExitFirst(cleanup)
}
