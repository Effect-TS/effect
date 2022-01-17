import type { Cause } from "../../Cause"
import { empty } from "../../Cause"
import { identity } from "../../Function"
import type { Effect, RIO } from "../definition"
import { foldCause_ } from "./foldCause"

/**
 * Returns an effect that succeeds with the cause of failure of this effect,
 * or `Cause.empty` if the effect did succeed.
 */
export function cause<R, E, A>(
  self: Effect<R, E, A>,
  __trace?: string
): RIO<R, Cause<E>> {
  return foldCause_(self, identity, () => empty, __trace)
}
