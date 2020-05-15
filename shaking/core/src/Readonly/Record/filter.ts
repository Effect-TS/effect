import type { Predicate, Refinement } from "../../Function"

import type { ReadonlyRecord } from "./ReadonlyRecord"
import { filter_ } from "./filter_"

export const filter: {
  <A, B extends A>(refinement: Refinement<A, B>): (
    fa: ReadonlyRecord<string, A>
  ) => ReadonlyRecord<string, B>
  <A>(predicate: Predicate<A>): (
    fa: ReadonlyRecord<string, A>
  ) => ReadonlyRecord<string, A>
} = <A>(predicate: Predicate<A>) => (
  fa: ReadonlyRecord<string, A>
): ReadonlyRecord<string, A> => filter_(fa, predicate)
