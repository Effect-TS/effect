// tracing: off

import * as T from "./deps-core"
import { Managed } from "./managed"
import * as Finalizer from "./ReleaseMap/finalizer"

/**
 * Lifts a `Effect< R, E, A>` into `Managed< R, E, A>` with no release action. The
 * effect will be performed interruptibly.
 */
export function fromEffect<R, E, A>(effect: T.Effect<R, E, A>) {
  return new Managed<R, E, A>(
    T.map_(
      T.provideSome_(effect, ([_]) => _),
      (a) => [Finalizer.noopFinalizer, a]
    )
  )
}

/**
 * Lifts a `Effect< R, E, A>` into `Managed<R, E, A>` with no release action. The
 * effect will be performed uninterruptibly. You usually want the `fromEffect`
 * variant.
 */
export function fromEffectUninterruptible<R, E, A>(effect: T.Effect<R, E, A>) {
  return fromEffect(T.uninterruptible(effect))
}
