import * as Tp from "../../Collections/Immutable/Tuple"
import { chain_ as effectChain } from "../../Effect/operations/chain"
import { done as effectDone } from "../../Effect/operations/done"
import { exit as effectExit } from "../../Effect/operations/exit"
import { map_ as effectMap_ } from "../../Effect/operations/map"
import type { Managed } from "../definition"
import { managedApply } from "../definition"
import * as Exit from "./_internal/exit"

/**
 * Returns an effect that models the execution of this effect, followed by the
 * passing of its value to the specified continuation function `k`, followed
 * by the effect that it returns.
 */
export function chain_<R, E, A, R2, E2, A2>(
  self: Managed<R, E, A>,
  f: (a: A) => Managed<R2, E2, A2>,
  __trace?: string
): Managed<R & R2, E | E2, A2> {
  return managedApply<R & R2, E | E2, A2>(
    effectChain(self.effect, ({ tuple: [releaseSelf, a] }) =>
      effectMap_(
        f(a).effect,
        ({ tuple: [releaseThat, b] }) =>
          Tp.tuple(
            (e) =>
              effectChain(effectExit(releaseThat(e)), (e1) =>
                effectChain(effectExit(releaseSelf(e)), (e2) =>
                  effectDone(Exit.zipRight_(e1, e2), __trace)
                )
              ),
            b
          ),
        __trace
      )
    )
  )
}

/**
 * Returns an effect that models the execution of this effect, followed by the
 * passing of its value to the specified continuation function `k`, followed
 * by the effect that it returns.
 *
 * @ets_data_first chain_
 */
export function chain<A, R2, E2, A2>(
  f: (a: A) => Managed<R2, E2, A2>,
  __trace?: string
) {
  return <R, E>(self: Managed<R, E, A>): Managed<R & R2, E | E2, A2> =>
    chain_(self, f, __trace)
}
