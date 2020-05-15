import type { Predicate } from "../../Function"

import type { ReadonlyRecord } from "./ReadonlyRecord"
import { filterWithIndex_ } from "./filterWithIndex_"

export const filter_ = <A>(
  fa: ReadonlyRecord<string, A>,
  predicate: Predicate<A>
): ReadonlyRecord<string, A> => {
  return filterWithIndex_(fa, (_, a) => predicate(a))
}
