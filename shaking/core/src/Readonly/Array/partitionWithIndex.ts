import type { Separated } from "fp-ts/lib/Compactable"
import type {
  RefinementWithIndex,
  PredicateWithIndex
} from "fp-ts/lib/FilterableWithIndex"

import { partitionWithIndex_ } from "./partitionWithIndex_"

export const partitionWithIndex: {
  <A, B extends A>(refinementWithIndex: RefinementWithIndex<number, A, B>): (
    fa: readonly A[]
  ) => Separated<readonly A[], readonly B[]>
  <A>(predicateWithIndex: PredicateWithIndex<number, A>): (
    fa: readonly A[]
  ) => Separated<readonly A[], readonly A[]>
} = <A>(predicateWithIndex: PredicateWithIndex<number, A>) => (
  fa: readonly A[]
): Separated<readonly A[], readonly A[]> => partitionWithIndex_(fa, predicateWithIndex)
