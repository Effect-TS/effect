import * as T from "./deps"
import { Managed } from "./managed"
import { ReleaseMap, makeReleaseMap, Sequential } from "./releaseMap"

/**
 * Ensures that a cleanup function runs when this ZManaged is finalized, before
 * the existing finalizers.
 */
export const onExitFirst_ = <S, R, E, A, S2, R2, E2>(
  self: Managed<S, R, E, A>,
  cleanup: (exit: T.Exit<E, A>) => T.Effect<S2, R2, E2, any>
) =>
  new Managed<S | S2, R & R2, E | E2, A>(
    T.uninterruptibleMask(({ restore }) =>
      T.Do()
        .bind("tp", T.environment<[R & R2, ReleaseMap]>())
        .letL("r", (s) => s.tp[0])
        .letL("outerReleaseMap", (s) => s.tp[1])
        .bind("innerReleaseMap", makeReleaseMap)
        .bindL("exitEA", (s) =>
          restore(
            T.provideAll_(T.result(T.map_(self.effect, ([_, a]) => a)), [
              s.r,
              s.innerReleaseMap
            ])
          )
        )
        .bindL("releaseMapEntry", (s) =>
          s.outerReleaseMap.add((e) =>
            T.flatten(
              T.zipWith_(
                T.result(T.provideAll_(cleanup(s.exitEA), s.r)),
                s.innerReleaseMap.releaseAll(e, new Sequential()),
                (l, r) => T.done(T.exitZipRight_(l, r))
              )
            )
          )
        )
        .bindL("a", (s) => T.done(s.exitEA))
        .return((s) => [s.releaseMapEntry, s.a])
    )
  )
