// ets_tracing: off

import * as Tp from "../../Collections/Immutable/Tuple"
import { provideEnvironment } from "../../Effect/operations/provideEnvironment"
import { currentReleaseMap } from "../../FiberRef/definition/concrete"
import { get } from "../../FiberRef/operations/get"
import { locally_ } from "../../FiberRef/operations/locally"
import { pipe } from "../../Function"
import type { Managed } from "../definition"
import { managedApply } from "../definition"
import { add_ } from "../ReleaseMap/add"
import { make } from "../ReleaseMap/make"
import { releaseAll_ } from "../ReleaseMap/releaseAll"
import * as T from "./_internal/effect"
import type { Exit } from "./_internal/exit"
import * as Ex from "./_internal/exit"

/**
 * Ensures that a cleanup function runs when this `Managed` is finalized and
 * before the existing finalizers.
 */
export function onExitFirst_<R, E, A, R1, X>(
  self: Managed<R, E, A>,
  cleanup: (exit: Exit<E, A>) => T.Effect<R1, never, X>,
  __trace?: string
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
            pipe(status.restore(self.effect), T.exit, T.map(Ex.map((_) => _.get(1))))
          )
        ),
        T.bind("releaseMapEntry", ({ exitEA, innerReleaseMap, outerReleaseMap, r1 }) =>
          add_(outerReleaseMap, (e) =>
            pipe(
              cleanup(exitEA),
              provideEnvironment(r1, __trace),
              T.exit,
              T.zipWith(T.exit(releaseAll_(innerReleaseMap, e, T.sequential)), (l, r) =>
                T.done(Ex.zipRight_(l, r))
              )
            )
          )
        ),
        T.bind("a", ({ exitEA }) => T.done(exitEA)),
        T.map(({ a, releaseMapEntry }) => Tp.tuple(releaseMapEntry, a))
      )
    )
  )
}

export function onExitFirst<E, A, R1, X>(
  cleanup: (exit: Exit<E, A>) => T.Effect<R1, never, X>,
  __trace?: string
) {
  return <R>(self: Managed<R, E, A>): Managed<R & R1, E, A> =>
    onExitFirst_(self, cleanup, __trace)
}
