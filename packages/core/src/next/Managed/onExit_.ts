import { pipe } from "../../Function"
import { sequential } from "../Effect/ExecutionStrategy"

import * as T from "./deps"
import { Managed } from "./managed"
import { ReleaseMap, makeReleaseMap } from "./releaseMap"

/**
 * Ensures that a cleanup function runs when this ZManaged is finalized, after
 * the existing finalizers.
 */
export const onExit_ = <S, R, E, A, S2, R2>(
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
            pipe(
              s.innerReleaseMap.releaseAll(e, sequential),
              T.result,
              T.zipWith(pipe(cleanup(s.exitEA), T.provideAll(s.r), T.result), (l, r) =>
                T.exitZipRight_(l, r)
              )
            )
          )
        ),
        T.bind("a", (s) => T.done(s.exitEA)),
        T.map((s) => [s.releaseMapEntry, s.a])
      )
    )
  )

/**
 * Ensures that a cleanup function runs when this ZManaged is finalized, after
 * the existing finalizers.
 */
export const onExit = <E, A, S2, R2>(
  cleanup: (exit: T.Exit<E, A>) => T.Effect<S2, R2, never, any>
) => <S, R>(self: Managed<S, R, E, A>) => onExit_(self, cleanup)
