import { done } from "../Promise/done"
import { Promise } from "../Promise/promise"

import { chain_ } from "./core"
import { Effect } from "./effect"
import { result } from "./result"
import { uninterruptibleMask } from "./uninterruptibleMask"

/**
 * Returns an effect that keeps or breaks a promise based on the result of
 * this effect. Synchronizes interruption, so if this effect is interrupted,
 * the specified promise will be interrupted, too.
 */
export const toPromise = <E, A>(p: Promise<E, A>) => <S, R>(
  effect: Effect<S, R, E, A>
): Effect<S, R, never, boolean> =>
  uninterruptibleMask(({ restore }) =>
    chain_(result(restore(effect)), (x) => done(x)(p))
  )
