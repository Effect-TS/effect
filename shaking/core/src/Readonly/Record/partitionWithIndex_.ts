import type { PredicateWithIndex } from "fp-ts/lib/FilterableWithIndex"

import type { ReadonlyRecord } from "./ReadonlyRecord"

export const partitionWithIndex_ = <A>(
  fa: ReadonlyRecord<string, A>,
  predicateWithIndex: PredicateWithIndex<string, A>
) => {
  const left: Record<string, A> = {}
  const right: Record<string, A> = {}
  const keys = Object.keys(fa)
  for (const key of keys) {
    const a = fa[key]
    if (predicateWithIndex(key, a)) {
      right[key] = a
    } else {
      left[key] = a
    }
  }
  return {
    left,
    right
  }
}
