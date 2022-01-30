import type { Tuple } from "../definition"
import { TupleInternal } from "./_internal/TupleInternal"

/**
 * Creates a new `Tuple`.
 *
 * @ets static ets/TupleOps __call
 */
export function tuple<Ks extends unknown[]>(...args: Ks): Tuple<Ks> {
  return new TupleInternal(args)
}
