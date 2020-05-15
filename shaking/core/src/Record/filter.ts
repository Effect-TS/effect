import type { Refinement, Predicate } from "../Function"
import { filter as filter_1 } from "../Readonly/Record"

export const filter: {
  <A, B extends A>(refinement: Refinement<A, B>): (
    fa: Record<string, A>
  ) => Record<string, B>
  <A>(predicate: Predicate<A>): (fa: Record<string, A>) => Record<string, A>
} = filter_1
