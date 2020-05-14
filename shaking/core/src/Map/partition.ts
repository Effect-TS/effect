import type { Separated } from "fp-ts/lib/Compactable"

import type { Refinement, Predicate } from "../Function"
import * as RM from "../Readonly/Map/partition"

export const partition: {
  <A, B extends A>(refinement: Refinement<A, B>): <E>(
    fa: Map<E, A>
  ) => Separated<Map<E, A>, Map<E, B>>
  <A>(predicate: Predicate<A>): <E>(fa: Map<E, A>) => Separated<Map<E, A>, Map<E, A>>
} = RM.partition as any
