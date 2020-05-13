import type { Separated } from "fp-ts/lib/Compactable"

import type { Refinement, Predicate } from "../Function"
import { partition as partition_1 } from "../Readonly/Array/partition"

export const partition: {
  <A, B extends A>(refinement: Refinement<A, B>): (fa: A[]) => Separated<A[], B[]>
  <A>(predicate: Predicate<A>): (fa: A[]) => Separated<A[], A[]>
} = partition_1 as any
