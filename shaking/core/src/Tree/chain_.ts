import { getMonoid } from "../Array"

import type { Tree } from "./Tree"

export const chain_ = <A, B>(fa: Tree<A>, f: (a: A) => Tree<B>): Tree<B> => {
  const { forest, value } = f(fa.value)
  const concat = getMonoid<Tree<B>>().concat
  return {
    value,
    forest: concat(
      forest,
      fa.forest.map((t) => chain_(t, f))
    )
  }
}
