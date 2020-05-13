import type {
  RefinementWithIndex,
  PredicateWithIndex
} from "fp-ts/lib/FilterableWithIndex"

import { filterWithIndex as filterWithIndex_1 } from "../Readonly/Array/filterWithIndex"

export const filterWithIndex: {
  <A, B extends A>(refinementWithIndex: RefinementWithIndex<number, A, B>): (
    fa: A[]
  ) => B[]
  <A>(predicateWithIndex: PredicateWithIndex<number, A>): (fa: A[]) => A[]
} = filterWithIndex_1 as any
