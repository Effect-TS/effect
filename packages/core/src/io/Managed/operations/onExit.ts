import { Tuple } from "../../../collection/immutable/Tuple"
import { Effect } from "../../Effect"
import { ExecutionStrategy } from "../../ExecutionStrategy"
import type { Exit } from "../../Exit"
import { FiberRef } from "../../FiberRef"
import { Managed } from "../definition"
import { ReleaseMap } from "../ReleaseMap"

/**
 * Ensures that a cleanup function runs when this `Managed` is finalized, after
 * the existing finalizers.
 *
 * @tsplus fluent ets/Managed onExit
 */
export function onExit_<R, E, A, R1, X>(
  self: Managed<R, E, A>,
  cleanup: (exit: Exit<E, A>) => Effect<R1, never, X>,
  __tsplusTrace?: string | undefined
): Managed<R & R1, E, A> {
  return Managed(
    Effect.uninterruptibleMask(({ restore }) =>
      Effect.Do()
        .bind("r1", () => Effect.environment<R1>())
        .bind("outerReleaseMap", () => FiberRef.currentReleaseMap.value.get())
        .bind("innerReleaseMap", () => ReleaseMap.make)
        .bind("exitEA", ({ innerReleaseMap }) =>
          restore(self.effect.map((_) => _.get(1)))
            .exit()
            .apply(FiberRef.currentReleaseMap.value.locally(innerReleaseMap))
        )
        .bind("releaseMapEntry", ({ exitEA, innerReleaseMap, outerReleaseMap, r1 }) =>
          outerReleaseMap.add((ex) =>
            innerReleaseMap
              .releaseAll(ex, ExecutionStrategy.Sequential)
              .exit()
              .zipWith(cleanup(exitEA).provideEnvironment(r1).exit(), (l, r) =>
                Effect.done(l.zipRight(r))
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
 * Ensures that a cleanup function runs when this `Managed` is finalized, after
 * the existing finalizers.
 *
 * @ets_data_first onExit_
 */
export function onExit<E, A, R1, X>(
  cleanup: (exit: Exit<E, A>) => Effect<R1, never, X>,
  __tsplusTrace?: string | undefined
) {
  return <R>(self: Managed<R, E, A>): Managed<R & R1, E, A> => self.onExit(cleanup)
}
