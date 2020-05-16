import type { Eq } from "../Eq"

import type { Tree } from "./Tree"

/**
 * @since 2.0.0
 */
export function elem<A>(E: Eq<A>): (a: A, fa: Tree<A>) => boolean {
  const go = (a: A, fa: Tree<A>): boolean => {
    if (E.equals(a, fa.value)) {
      return true
    }
    return fa.forest.some((tree) => go(a, tree))
  }
  return go
}
