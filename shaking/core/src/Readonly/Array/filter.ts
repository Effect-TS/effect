import type { Predicate, Refinement } from "../../Function"

import { filter_ } from "./filter_"

export const filter: {
  <A, B extends A>(refinement: Refinement<A, B>): (fa: readonly A[]) => readonly B[]
  <A>(predicate: Predicate<A>): (fa: readonly A[]) => readonly A[]
} = <A>(predicate: Predicate<A>) => (fa: readonly A[]): readonly A[] =>
  filter_(fa, predicate)
