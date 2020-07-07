import * as T from "./deps"
import { Managed } from "./managed"
import { ReleaseMap } from "./releaseMap"

/**
 * Lifts a `Effect<S, R, E, A>` into `Managed<S, R, E, A>` with a release action
 * that handles `Exit`. The acquire and release actions will be performed uninterruptibly.
 */
export const makeExit_ = <S, R, E, A, S1, R1, E1>(
  acquire: T.Effect<S, R, E, A>,
  release: (a: A, exit: T.Exit<any, any>) => T.Effect<S1, R1, E1, any>
) =>
  new Managed<S | S1, R & R1, E | E1, A>(
    T.uninterruptible(
      T.Do()
        .bind("r", T.environment<[R & R1, ReleaseMap]>())
        .bindL("a", (s) => T.provideAll_(acquire, s.r[0]))
        .bindL("rm", (s) => s.r[1].add((ex) => T.provideAll_(release(s.a, ex), s.r[0])))
        .return((s) => [s.rm, s.a])
    )
  )
