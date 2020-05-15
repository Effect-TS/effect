import type { PredicateWithIndex } from "fp-ts/lib/FilterableWithIndex"

import type { ReadonlyRecord } from "./ReadonlyRecord"
import { _hasOwnProperty } from "./_hasOwnProperty"

export const filterWithIndex_ = <A>(
  fa: ReadonlyRecord<string, A>,
  predicateWithIndex: PredicateWithIndex<string, A>
) => {
  const out: Record<string, A> = {}
  let changed = false
  for (const key in fa) {
    if (_hasOwnProperty.call(fa, key)) {
      const a = fa[key]
      if (predicateWithIndex(key, a)) {
        out[key] = a
      } else {
        changed = true
      }
    }
  }
  return changed ? out : fa
}
