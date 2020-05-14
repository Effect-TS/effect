import { Refinement, Predicate } from "../Function"
import * as RM from "../Readonly/Map/filter"

export const filter: {
  <A, B extends A>(refinement: Refinement<A, B>): <E>(fa: Map<E, A>) => Map<E, B>
  <A>(predicate: Predicate<A>): <E>(fa: Map<E, A>) => Map<E, A>
} = RM.filter as any
