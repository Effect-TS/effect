import { HashMap } from "../../HashMap"
import type { HashSet } from "../definition"
import { HashSetInternal } from "./_internal/hashSet"

/**
 * Construct a new empty `HashSet`.
 *
 * @tsplus static ets/HashSetOps __call
 */
export function make<A>(): HashSet<A> {
  return new HashSetInternal(HashMap())
}
