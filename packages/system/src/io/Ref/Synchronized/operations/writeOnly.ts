import { Either } from "../../../../data/Either"
import { identity } from "../../../../data/Function"
import type { XSynchronized } from "../definition"

/**
 * Returns a write only view of the `XRef.Synchronized`.
 */
export function writeOnly<RA, RB, EA, EB, A, B>(
  self: XSynchronized<RA, RB, EA, EB, A, B>
): XSynchronized<RA, RB, EA, void, A, never> {
  return self.fold(
    identity,
    () => undefined,
    Either.right,
    () => Either.left(undefined)
  )
}
