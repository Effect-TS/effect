// ets_tracing: off

import * as Tp from "../Collections/Immutable/Tuple/index.js"
import * as T from "./deps-core.js"
import { managedApply } from "./managed.js"
import * as Finalizer from "./ReleaseMap/finalizer.js"

/**
 * Lifts a `Effect< R, E, A>` into `Managed< R, E, A>` with no release action. The
 * effect will be performed interruptibly.
 */
export function fromEffect<R, E, A>(effect: T.Effect<R, E, A>, __trace?: string) {
  return managedApply<R, E, A>(
    T.map_(
      T.provideSome_(effect, (_) => _.get(0), __trace),
      (a) => Tp.tuple(Finalizer.noopFinalizer, a)
    )
  )
}

/**
 * Lifts a `Effect< R, E, A>` into `Managed<R, E, A>` with no release action. The
 * effect will be performed uninterruptibly. You usually want the `fromEffect`
 * variant.
 */
export function fromEffectUninterruptible<R, E, A>(
  effect: T.Effect<R, E, A>,
  __trace?: string
) {
  return fromEffect(T.uninterruptible(effect), __trace)
}
