import type {
  RefinementWithIndex,
  PredicateWithIndex
} from "fp-ts/lib/FilterableWithIndex"

import { filterWithIndex_ } from "./filterWithIndex_"

export const filterWithIndex: {
  <A, B extends A>(refinementWithIndex: RefinementWithIndex<number, A, B>): (
    fa: readonly A[]
  ) => readonly B[]
  <A>(predicateWithIndex: PredicateWithIndex<number, A>): (
    fa: readonly A[]
  ) => readonly A[]
} = <A>(predicateWithIndex: PredicateWithIndex<number, A>) => (
  fa: readonly A[]
): readonly A[] => filterWithIndex_(fa, predicateWithIndex)
