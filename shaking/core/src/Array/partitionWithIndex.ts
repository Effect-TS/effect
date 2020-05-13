import type { Separated } from "fp-ts/lib/Compactable"
import type {
  RefinementWithIndex,
  PredicateWithIndex
} from "fp-ts/lib/FilterableWithIndex"

import { partitionWithIndex as partitionWithIndex_1 } from "../Readonly/Array/partitionWithIndex"

export const partitionWithIndex: {
  <A, B extends A>(refinementWithIndex: RefinementWithIndex<number, A, B>): (
    fa: A[]
  ) => Separated<A[], B[]>
  <A>(predicateWithIndex: PredicateWithIndex<number, A>): (
    fa: A[]
  ) => Separated<A[], A[]>
} = partitionWithIndex_1 as any
