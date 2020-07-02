import * as T from "./deps"
import { Managed, noop } from "./managed"
import { ReleaseMap } from "./releaseMap"

/**
 * Lifts a `Effect<S, R, E, A>` into `Managed<S, R, E, A>` with no release action. The
 * effect will be performed interruptibly.
 */
export const fromEffect = <S, R, E, A>(effect: T.Effect<S, R, E, A>) =>
  new Managed<S, R, E, A>(
    T.map_(
      T.accessM((_: [R, ReleaseMap]) => T.provideAll_(effect, _[0])),
      (a) => [noop, a]
    )
  )
