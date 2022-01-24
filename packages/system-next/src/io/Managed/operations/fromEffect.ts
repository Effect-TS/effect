import * as Tp from "../../../collection/immutable/Tuple"
import type { Effect } from "../../Effect/definition"
import {
  uninterruptible,
  uninterruptibleMask
} from "../../Effect/operations/interruption"
import { map_ } from "../../Effect/operations/map"
import { managedApply } from "../definition"
import * as Finalizer from "../ReleaseMap/finalizer"

/**
 * Lifts a `Effect< R, E, A>` into `Managed< R, E, A>` with no release action.
 * The effect will be performed interruptibly.
 */
export function fromEffect<R, E, A>(effect: Effect<R, E, A>, __trace?: string) {
  return managedApply<R, E, A>(
    uninterruptibleMask((status) =>
      map_(status.restore(effect, __trace), (a) => Tp.tuple(Finalizer.noopFinalizer, a))
    )
  )
}

/**
 * Lifts a `Effect<R, E, A>` into `Managed<R, E, A>` with no release action. The
 * effect will be performed uninterruptibly. You usually want the `fromEffect`
 * variant.
 */
export function fromEffectUninterruptible<R, E, A>(
  effect: Effect<R, E, A>,
  __trace?: string
) {
  return fromEffect(uninterruptible(effect), __trace)
}
