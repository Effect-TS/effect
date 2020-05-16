import type { Applicative } from "fp-ts/lib/Applicative"
import type { HKT } from "fp-ts/lib/HKT"
import type { Traverse1 } from "fp-ts/lib/Traversable"

import { traverse as traverseArray } from "../Array"

import type { Forest, Tree } from "./Tree"
import { URI } from "./URI"

export const traverse: Traverse1<URI> = <F>(
  F: Applicative<F>
): (<A, B>(ta: Tree<A>, f: (a: A) => HKT<F, B>) => HKT<F, Tree<B>>) => {
  const traverseF = traverseArray(F)
  const r = <A, B>(ta: Tree<A>, f: (a: A) => HKT<F, B>): HKT<F, Tree<B>> =>
    F.ap(
      F.map(f(ta.value), (value: B) => (forest: Forest<B>) => ({
        value,
        forest
      })),
      traverseF(ta.forest, (t) => r(t, f))
    )
  return r
}
