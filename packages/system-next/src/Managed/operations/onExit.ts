import * as Tp from "../../Collections/Immutable/Tuple"
import { provideEnvironment_ } from "../../Effect/operations/provideEnvironment"
import { currentReleaseMap } from "../../FiberRef/definition/data"
import { get } from "../../FiberRef/operations/get"
import { locally_ } from "../../FiberRef/operations/locally"
import { pipe } from "../../Function"
import type { Managed } from "../definition"
import { managedApply } from "../definition"
import { add_ } from "../ReleaseMap/add"
import { make } from "../ReleaseMap/make"
import { releaseAll_ } from "../ReleaseMap/releaseAll"
import type { Effect } from "./_internal/effect"
import * as T from "./_internal/effect"
import type { Exit } from "./_internal/exit"
import * as Ex from "./_internal/exit"

/**
 * Ensures that a cleanup function runs when this `Managed` is finalized, after
 * the existing finalizers.
 */
export function onExit_<R, E, A, R1, X>(
  self: Managed<R, E, A>,
  cleanup: (exit: Exit<E, A>) => Effect<R1, never, X>,
  __trace?: string | undefined
): Managed<R & R1, E, A> {
  return managedApply(
    T.uninterruptibleMask((status) =>
      pipe(
        T.do,
        T.bind("r1", () => T.environment<R1>()),
        T.bind("outerReleaseMap", () => get(currentReleaseMap.value)),
        T.bind("innerReleaseMap", () => make),
        T.bind("exitEA", ({ innerReleaseMap }) =>
          locally_(
            currentReleaseMap.value,
            innerReleaseMap,
            T.exit(status.restore(T.map_(self.effect, (_) => _.get(1))))
          )
        ),
        T.bind("releaseMapEntry", ({ exitEA, innerReleaseMap, outerReleaseMap, r1 }) =>
          add_(outerReleaseMap, (ex) =>
            pipe(
              releaseAll_(innerReleaseMap, ex, T.sequential),
              T.exit,
              T.zipWith(
                T.exit(provideEnvironment_(cleanup(exitEA), r1, __trace)),
                (l, r) => T.done(Ex.zipRight_(l, r))
              ),
              T.flatten
            )
          )
        ),
        T.bind("a", ({ exitEA }) => T.done(exitEA)),
        T.map(({ a, releaseMapEntry }) => Tp.tuple(releaseMapEntry, a))
      )
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
  __trace?: string | undefined
) {
  return <R>(self: Managed<R, E, A>): Managed<R & R1, E, A> =>
    onExit_(self, cleanup, __trace)
}
