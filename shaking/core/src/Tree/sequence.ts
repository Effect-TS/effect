import type { Applicative } from "fp-ts/lib/Applicative"
import type { HKT } from "fp-ts/lib/HKT"

import { identity } from "../Function"

import type { Tree } from "./Tree"
import { traverse } from "./traverse"

export const sequence = <F>(
  F: Applicative<F>
): (<A>(ta: Tree<HKT<F, A>>) => HKT<F, Tree<A>>) => {
  const traverseF = traverse(F)
  return (ta) => traverseF(ta, identity)
}
