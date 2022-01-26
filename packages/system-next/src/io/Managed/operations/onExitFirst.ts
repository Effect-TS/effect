import * as Tp from "../../../collection/immutable/Tuple"
import { Effect } from "../../Effect"
import { sequential } from "../../Effect/operations/ExecutionStrategy"
import type { Exit } from "../../Exit"
import { map as exitMap } from "../../Exit/operations/map"
import { zipRight_ as exitZipRight_ } from "../../Exit/operations/zipRight"
import { currentReleaseMap } from "../../FiberRef/definition/data"
import { get } from "../../FiberRef/operations/get"
import { locally_ } from "../../FiberRef/operations/locally"
import { Managed } from "../definition"
import { ReleaseMap } from "../ReleaseMap"

/**
 * Ensures that a cleanup function runs when this `Managed` is finalized and
 * before the existing finalizers.
 *
 * @ets fluent ets/Managed onExitFirst
 */
export function onExitFirst_<R, E, A, R1, X>(
  self: Managed<R, E, A>,
  cleanup: (exit: Exit<E, A>) => Effect<R1, never, X>,
  __etsTrace?: string
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
              .map(exitMap((_) => _.get(1)))
          )
        )
        .bind("releaseMapEntry", ({ exitEA, innerReleaseMap, outerReleaseMap, r1 }) =>
          outerReleaseMap.add((e) =>
            cleanup(exitEA)
              .provideEnvironment(r1)
              .exit()
              .zipWith(innerReleaseMap.releaseAll(e, sequential).exit(), (l, r) =>
                Effect.done(exitZipRight_(l, r))
              )
              .flatten()
          )
        )
        .bind("a", ({ exitEA }) => Effect.done(exitEA))
        .map(({ a, releaseMapEntry }) => Tp.tuple(releaseMapEntry, a))
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
  __etsTrace?: string
) {
  return <R>(self: Managed<R, E, A>): Managed<R & R1, E, A> =>
    onExitFirst_(self, cleanup)
}
