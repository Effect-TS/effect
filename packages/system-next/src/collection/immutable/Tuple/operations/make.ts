import type { Tuple } from "../definition"
import { TupleInternal } from "./_internal/TupleInternal"

/**
 * Creates a new `Tuple`.
 *
 * @tsplus static ets/TupleOps __call
 */
export function make<Ks extends unknown[]>(...args: Ks): Tuple<Ks> {
  return new TupleInternal(args)
}
