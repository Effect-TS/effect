import { pipe } from "../../Function"

import * as T from "./deps"
import { Managed } from "./managed"
import { ReleaseMap } from "./releaseMap"

/**
 * Lifts a `Effect<S, R, E, A>` into `Managed<S, R, E, A>` with a release action
 * that handles `Exit`. The acquire and release actions will be performed uninterruptibly.
 */
export const makeExit_ = <S, R, E, A, S1, R1>(
  acquire: T.Effect<S, R, E, A>,
  release: (a: A, exit: T.Exit<any, any>) => T.Effect<S1, R1, never, unknown>
) =>
  new Managed<S | S1, R & R1, E, A>(
    T.uninterruptible(
      pipe(
        T.of,
        T.bind("r", () => T.environment<[R & R1, ReleaseMap]>()),
        T.bind("a", (s) => T.provideAll_(acquire, s.r[0])),
        T.bind("rm", (s) =>
          s.r[1].add((ex) => T.provideAll_(release(s.a, ex), s.r[0]))
        ),
        T.map((s) => [s.rm, s.a])
      )
    )
  )
