// ets_tracing: off

import * as Tp from "../../Collections/Immutable/Tuple"
import type { Managed } from "../definition"
import { managedApply } from "../definition"
import * as T from "./_internal/effect"
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
    T.chain_(self.effect, ({ tuple: [releaseSelf, a] }) =>
      T.map_(
        f(a).effect,
        ({ tuple: [releaseThat, b] }) =>
          Tp.tuple(
            (e) =>
              T.chain_(T.exit(releaseThat(e)), (e1) =>
                T.chain_(T.exit(releaseSelf(e)), (e2) =>
                  T.done(Exit.zipRight_(e1, e2), __trace)
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
