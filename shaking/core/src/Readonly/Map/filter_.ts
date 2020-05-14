import type { Filter2 } from "fp-ts/lib/Filterable"

import type { Predicate } from "../../Function"

import { URI } from "./URI"
import { filterWithIndex_ } from "./filterWithIndex_"

export const filter_: Filter2<URI> = <K, A>(
  fa: ReadonlyMap<K, A>,
  p: Predicate<A>
): ReadonlyMap<K, A> => filterWithIndex_(fa, (_, a) => p(a))
