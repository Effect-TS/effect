import { Separated } from "fp-ts/lib/Compactable"

import { Predicate, Refinement } from "../../Function"

import { partition_ } from "./partition_"

export const partition: {
  <A, B extends A>(refinement: Refinement<A, B>): <E>(
    fa: ReadonlyMap<E, A>
  ) => Separated<ReadonlyMap<E, A>, ReadonlyMap<E, B>>
  <A>(predicate: Predicate<A>): <E>(
    fa: ReadonlyMap<E, A>
  ) => Separated<ReadonlyMap<E, A>, ReadonlyMap<E, A>>
} = <A>(predicate: Predicate<A>) => <E>(
  fa: ReadonlyMap<E, A>
): Separated<ReadonlyMap<E, A>, ReadonlyMap<E, A>> => partition_(fa, predicate)
