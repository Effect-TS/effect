import type { Separated } from "fp-ts/lib/Compactable"

import type { Predicate, Refinement } from "../../Function"

import type { ReadonlyRecord } from "./ReadonlyRecord"
import { partition_ } from "./partition_"

export const partition: {
  <A, B extends A>(refinement: Refinement<A, B>): (
    fa: ReadonlyRecord<string, A>
  ) => Separated<ReadonlyRecord<string, A>, ReadonlyRecord<string, B>>
  <A>(predicate: Predicate<A>): (
    fa: ReadonlyRecord<string, A>
  ) => Separated<ReadonlyRecord<string, A>, ReadonlyRecord<string, A>>
} = <A>(predicate: Predicate<A>) => (
  fa: ReadonlyRecord<string, A>
): Separated<ReadonlyRecord<string, A>, ReadonlyRecord<string, A>> =>
  partition_(fa, predicate)
