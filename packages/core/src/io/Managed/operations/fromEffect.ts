import { Tuple } from "../../../collection/immutable/Tuple"
import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../Effect"
import { Managed } from "../definition"
import * as Finalizer from "../ReleaseMap/finalizer"

/**
 * Lifts a `Effect< R, E, A>` into `Managed< R, E, A>` with no release action.
 * The effect will be performed interruptibly.
 *
 * @tsplus static ets/ManagedOps fromEffect
 */
export function fromEffect<R, E, A>(
  effect: LazyArg<Effect<R, E, A>>,
  __tsplusTrace?: string
) {
  return Managed<R, E, A>(
    Effect.uninterruptibleMask(({ restore }) =>
      restore(effect).map((a) => Tuple(Finalizer.noopFinalizer, a))
    )
  )
}

/**
 * Lifts a `Effect<R, E, A>` into `Managed<R, E, A>` with no release action. The
 * effect will be performed uninterruptibly. You usually want the `fromEffect`
 * variant.
 *
 * @tsplus static ets/ManagedOps fromEffectUninterruptible
 */
export function fromEffectUninterruptible<R, E, A>(
  effect: LazyArg<Effect<R, E, A>>,
  __tsplusTrace?: string
) {
  return fromEffect(Effect.suspendSucceed(effect).uninterruptible())
}
