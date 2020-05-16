import { getEq as getArrayEq } from "../Array"
import { Eq, fromEquals } from "../Eq"

import type { Tree } from "./Tree"

/**
 * @since 2.0.0
 */
export function getEq<A>(E: Eq<A>): Eq<Tree<A>> {
  // eslint-disable-next-line prefer-const
  let SA: Eq<Array<Tree<A>>>
  const R: Eq<Tree<A>> = fromEquals(
    (x, y) => E.equals(x.value, y.value) && SA.equals(x.forest, y.forest)
  )
  SA = getArrayEq(R)
  return R
}
