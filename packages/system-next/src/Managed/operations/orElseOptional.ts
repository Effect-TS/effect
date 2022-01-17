import * as O from "../../Option"
import type { Managed } from "../definition"
import { catchAll_ } from "./catchAll"
import { failNow } from "./failNow"

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails with the `None` value, in which case it will produce the value of
 * the specified effect.
 */
export function orElseOptional_<R, E, A, R2, E2, A2>(
  self: Managed<R, O.Option<E>, A>,
  that: () => Managed<R2, O.Option<E2>, A2>,
  __trace?: string
): Managed<R & R2, O.Option<E | E2>, A | A2> {
  return catchAll_(
    self,
    O.fold(that, (e) => failNow(O.some<E | E2>(e))),
    __trace
  )
}

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails with the `None` value, in which case it will produce the value of
 * the specified effect.
 *
 * @ets_data_first orElseOptional_
 */
export function orElseOptional<R2, E2, A2>(
  that: () => Managed<R2, O.Option<E2>, A2>,
  __trace?: string
) {
  return <R, E, A>(self: Managed<R, O.Option<E>, A>) =>
    orElseOptional_(self, that, __trace)
}
