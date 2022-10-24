import type { AtomicHub } from "@effect/core/io/Hub/operations/_internal/AtomicHub"
import { UnboundedHub } from "@effect/core/io/Hub/operations/_internal/UnboundedHub"

/** @internal */
export function makeUnbounded<A>(): AtomicHub<A> {
  return new UnboundedHub()
}
