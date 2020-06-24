import * as T from "./deps"
import { Managed } from "./managed"
import { onExitFirst_ } from "./onExitFirst_"

/**
 * Ensures that a cleanup function runs when this ZManaged is finalized, before
 * the existing finalizers.
 */
export const onExitFirst = <E, A, S2, R2, E2>(
  cleanup: (exit: T.Exit<E, A>) => T.Effect<S2, R2, E2, any>
) => <S, R>(self: Managed<S, R, E, A>) => onExitFirst_(self, cleanup)
