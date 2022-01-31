// ets_tracing: off

import * as Tp from "../Collections/Immutable/Tuple/index.js"
import { pipe } from "../Function/index.js"
import * as T from "./deps-core.js"
import { managedApply } from "./managed.js"
import * as add from "./ReleaseMap/add.js"
import type { ReleaseMap } from "./ReleaseMap/index.js"

/**
 * Lifts a `Effect< R, E, A>` into `Managed< R, E, A>` with a release action
 * that handles `Exit`. The acquire and release actions will be performed uninterruptibly.
 *
 * @ets_data_first makeExit_
 */
export function makeExit<R1, A, X>(
  release: (a: A, exit: T.Exit<any, any>) => T.Effect<R1, never, X>,
  __trace?: string
) {
  return <R, E>(acquire: T.Effect<R, E, A>) => makeExit_(acquire, release, __trace)
}

/**
 * Lifts a `Effect< R, E, A>` into `Managed< R, E, A>` with a release action
 * that handles `Exit`. The acquire and release actions will be performed uninterruptibly.
 */
export function makeExit_<R, E, A, R1, X>(
  acquire: T.Effect<R, E, A>,
  release: (a: A, exit: T.Exit<any, any>) => T.Effect<R1, never, X>,
  __trace?: string
) {
  return managedApply<R & R1, E, A>(
    T.uninterruptible(
      pipe(
        T.do,
        T.bind("r", () => T.environment<Tp.Tuple<[R & R1, ReleaseMap]>>()),
        T.bind("a", (s) => T.provideAll_(acquire, s.r.get(0)), __trace),
        T.bind("rm", (s) =>
          add.add((ex) => T.provideAll_(release(s.a, ex), s.r.get(0), __trace))(
            s.r.get(1)
          )
        ),
        T.map((s) => Tp.tuple(s.rm, s.a))
      )
    )
  )
}
