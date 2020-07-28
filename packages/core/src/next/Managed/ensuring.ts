import * as T from "./deps"
import { Managed } from "./managed"
import { onExit_ } from "./onExit_"

/**
 * Ensures that `f` is executed when this Managed is finalized, after
 * the existing finalizer.
 *
 * For usecases that need access to the Managed's result, see [[onExit]].
 */
export const ensuring_ = <S, R, E, A, S2, R2>(
  self: Managed<S, R, E, A>,
  f: T.Effect<S2, R2, never, any>
) => onExit_(self, () => f)

/**
 * Ensures that `f` is executed when this Managed is finalized, after
 * the existing finalizer.
 *
 * For usecases that need access to the Managed's result, see [[onExit]].
 */
export const ensuring = <S2, R2>(f: T.Effect<S2, R2, never, any>) => <S, R, E, A>(
  self: Managed<S, R, E, A>
) => ensuring_(self, f)
