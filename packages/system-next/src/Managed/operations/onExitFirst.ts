import * as Tp from "../../Collections/Immutable/Tuple"
import type { Effect } from "../../Effect/definition"
import { bind, do as effectDo } from "../../Effect/operations/do"
import { done } from "../../Effect/operations/done"
import { environment } from "../../Effect/operations/environment"
import { sequential } from "../../Effect/operations/ExecutionStrategy"
import { exit } from "../../Effect/operations/exit"
import { uninterruptibleMask } from "../../Effect/operations/interruption"
import { map } from "../../Effect/operations/map"
import { provideEnvironment } from "../../Effect/operations/provideEnvironment"
import { zipWith } from "../../Effect/operations/zipWith"
import { currentReleaseMap } from "../../FiberRef/definition/data"
import { get } from "../../FiberRef/operations/get"
import { locally_ } from "../../FiberRef/operations/locally"
import { pipe } from "../../Function"
import type { Managed } from "../definition"
import { managedApply } from "../definition"
import { add_ } from "../ReleaseMap/add"
import { make } from "../ReleaseMap/make"
import { releaseAll_ } from "../ReleaseMap/releaseAll"
import type { Exit } from "./_internal/exit"
import * as Ex from "./_internal/exit"

/**
 * Ensures that a cleanup function runs when this `Managed` is finalized and
 * before the existing finalizers.
 */
export function onExitFirst_<R, E, A, R1, X>(
  self: Managed<R, E, A>,
  cleanup: (exit: Exit<E, A>) => Effect<R1, never, X>,
  __trace?: string
): Managed<R & R1, E, A> {
  return managedApply(
    uninterruptibleMask((status) =>
      pipe(
        effectDo,
        bind("r1", () => environment<R1>()),
        bind("outerReleaseMap", () => get(currentReleaseMap.value)),
        bind("innerReleaseMap", () => make),
        bind("exitEA", ({ innerReleaseMap }) =>
          locally_(
            currentReleaseMap.value,
            innerReleaseMap
          )(pipe(status.restore(self.effect), exit, map(Ex.map((_) => _.get(1)))))
        ),
        bind("releaseMapEntry", ({ exitEA, innerReleaseMap, outerReleaseMap, r1 }) =>
          add_(outerReleaseMap, (e) =>
            pipe(
              cleanup(exitEA),
              provideEnvironment(r1, __trace),
              exit,
              zipWith(exit(releaseAll_(innerReleaseMap, e, sequential)), (l, r) =>
                done(Ex.zipRight_(l, r))
              )
            )
          )
        ),
        bind("a", ({ exitEA }) => done(exitEA)),
        map(({ a, releaseMapEntry }) => Tp.tuple(releaseMapEntry, a))
      )
    )
  )
}

export function onExitFirst<E, A, R1, X>(
  cleanup: (exit: Exit<E, A>) => Effect<R1, never, X>,
  __trace?: string
) {
  return <R>(self: Managed<R, E, A>): Managed<R & R1, E, A> =>
    onExitFirst_(self, cleanup, __trace)
}
