import type { Refinement, Predicate } from "../Function"
import { filter as filter_1 } from "../Readonly/Array/filter"

export const filter: {
  <A, B extends A>(refinement: Refinement<A, B>): (fa: A[]) => B[]
  <A>(predicate: Predicate<A>): (fa: A[]) => A[]
} = filter_1 as any
