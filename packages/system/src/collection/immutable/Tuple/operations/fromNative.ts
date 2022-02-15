import type { Tuple } from "../definition"
import { TupleInternal } from "./_internal/TupleInternal"

/**
 * Converts from native tuple type.
 *
 * @tsplus static ets/TupleOps fromNative
 */
export function fromNative<Ks extends readonly unknown[]>(self: Ks): Tuple<Ks> {
  return new TupleInternal(self)
}
