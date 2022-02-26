import { Either } from "../../../data/Either"
import { identity } from "../../../data/Function"
import type { XRef } from "../definition"

/**
 * Returns a write only view of the `XRef`.
 *
 * @tsplus fluent ets/XRef writeOnly
 */
export function writeOnly<RA, RB, EA, EB, A, B>(
  self: XRef<RA, RB, EA, EB, A, B>
): XRef<RA, RB, EA, void, A, never> {
  return self.fold(
    identity,
    () => undefined,
    Either.right,
    () => Either.left(undefined)
  )
}
