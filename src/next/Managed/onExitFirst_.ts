import { pipe } from "../../Function"
import { sequential } from "../Effect/ExecutionStrategy"

import * as T from "./deps"
import { Managed } from "./managed"
import { ReleaseMap, makeReleaseMap } from "./releaseMap"

/**
 * Ensures that a cleanup function runs when this ZManaged is finalized, before
 * the existing finalizers.
 */
export const onExitFirst_ = <S, R, E, A, S2, R2>(
  self: Managed<S, R, E, A>,
  cleanup: (exit: T.Exit<E, A>) => T.Effect<S2, R2, never, any>
) =>
  new Managed<S | S2, R & R2, E, A>(
    T.uninterruptibleMask(({ restore }) =>
      pipe(
        T.of,
        T.bind("tp", () => T.environment<[R & R2, ReleaseMap]>()),
        T.let("r", (s) => s.tp[0]),
        T.let("outerReleaseMap", (s) => s.tp[1]),
        T.bind("innerReleaseMap", () => makeReleaseMap),
        T.bind("exitEA", (s) =>
          restore(
            T.provideAll_(T.result(T.map_(self.effect, ([_, a]) => a)), [
              s.r,
              s.innerReleaseMap
            ])
          )
        ),
        T.bind("releaseMapEntry", (s) =>
          s.outerReleaseMap.add((e) =>
            T.flatten(
              T.zipWith_(
                T.result(T.provideAll_(cleanup(s.exitEA), s.r)),
                T.result(s.innerReleaseMap.releaseAll(e, sequential)),
                (l, r) => T.done(T.exitZipRight_(l, r))
              )
            )
          )
        ),
        T.bind("a", (s) => T.done(s.exitEA)),
        T.map((s) => [s.releaseMapEntry, s.a])
      )
    )
  )
