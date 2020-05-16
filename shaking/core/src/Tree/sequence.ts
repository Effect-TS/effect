import type { Applicative } from "fp-ts/lib/Applicative"
import type { HKT } from "fp-ts/lib/HKT"
import type { Sequence1 } from "fp-ts/lib/Traversable"

import { identity } from "../Function"

import type { Tree } from "./Tree"
import { URI } from "./URI"
import { traverse } from "./traverse"

export const sequence: Sequence1<URI> = <F>(
  F: Applicative<F>
): (<A>(ta: Tree<HKT<F, A>>) => HKT<F, Tree<A>>) => {
  const traverseF = traverse(F)
  return (ta) => traverseF(ta, identity)
}
