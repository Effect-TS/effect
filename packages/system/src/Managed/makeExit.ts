// tracing: off

import { pipe } from "../Function"
import * as T from "./deps-core"
import { Managed } from "./managed"
import type { ReleaseMap } from "./ReleaseMap"
import * as add from "./ReleaseMap/add"

/**
 * Lifts a `Effect< R, E, A>` into `Managed< R, E, A>` with a release action
 * that handles `Exit`. The acquire and release actions will be performed uninterruptibly.
 */
export function makeExit<R1, A, X>(
  release: (a: A, exit: T.Exit<any, any>) => T.Effect<R1, never, X>
) {
  return <R, E>(acquire: T.Effect<R, E, A>) => makeExit_(acquire, release)
}

/**
 * Lifts a `Effect< R, E, A>` into `Managed< R, E, A>` with a release action
 * that handles `Exit`. The acquire and release actions will be performed uninterruptibly.
 */
export function makeExit_<R, E, A, R1, X>(
  acquire: T.Effect<R, E, A>,
  release: (a: A, exit: T.Exit<any, any>) => T.Effect<R1, never, X>
) {
  return new Managed<R & R1, E, A>(
    T.uninterruptible(
      pipe(
        T.do,
        T.bind("r", () => T.environment<readonly [R & R1, ReleaseMap]>()),
        T.bind("a", (s) => T.provideAll_(acquire, s.r[0])),
        T.bind("rm", (s) =>
          add.add((ex) => T.provideAll_(release(s.a, ex), s.r[0]))(s.r[1])
        ),
        T.map((s) => [s.rm, s.a])
      )
    )
  )
}
