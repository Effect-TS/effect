import type { Separated } from "fp-ts/lib/Compactable"

import type { Refinement, Predicate } from "../Function"
import { partition as partition_1 } from "../Readonly/Record"

export const partition: {
  <A, B extends A>(refinement: Refinement<A, B>): (
    fa: Record<string, A>
  ) => Separated<Record<string, A>, Record<string, B>>
  <A>(predicate: Predicate<A>): (
    fa: Record<string, A>
  ) => Separated<Record<string, A>, Record<string, A>>
} = partition_1
