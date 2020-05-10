import type { Separated } from "fp-ts/lib/Compactable"
import type { Option } from "fp-ts/lib/Option"
import type { Predicate } from "fp-ts/lib/function"

import { filter_ } from "./filter_"

export const partition_ = <A>(
  fa: Option<A>,
  predicate: Predicate<A>
): Separated<Option<A>, Option<A>> => {
  return {
    left: filter_(fa, (a) => !predicate(a)),
    right: filter_(fa, predicate)
  }
}
