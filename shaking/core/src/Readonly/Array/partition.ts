import type { Separated } from "fp-ts/lib/Compactable"

import type { Predicate, Refinement } from "../../Function"

import { partition_ } from "./partition_"

export const partition: {
  <A, B extends A>(refinement: Refinement<A, B>): (
    fa: readonly A[]
  ) => Separated<readonly A[], readonly B[]>
  <A>(predicate: Predicate<A>): (
    fa: readonly A[]
  ) => Separated<readonly A[], readonly A[]>
} = <A>(predicate: Predicate<A>) => (
  fa: readonly A[]
): Separated<readonly A[], readonly A[]> => partition_(fa, predicate)
