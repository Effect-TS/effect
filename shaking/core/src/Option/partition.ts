import type { Separated } from "fp-ts/lib/Compactable"
import type { Option } from "fp-ts/lib/Option"
import type { Predicate, Refinement } from "fp-ts/lib/function"

import { partition_ } from "./partition_"

export const partition: {
  <A, B extends A>(refinement: Refinement<A, B>): (
    fa: Option<A>
  ) => Separated<Option<A>, Option<B>>
  <A>(predicate: Predicate<A>): (fa: Option<A>) => Separated<Option<A>, Option<A>>
} = <A>(predicate: Predicate<A>) => (fa: Option<A>) => partition_(fa, predicate)
