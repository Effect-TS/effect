import type { Applicative } from "fp-ts/lib/Applicative"
import type { HKT } from "fp-ts/lib/HKT"
import type { TraverseWithIndex1 } from "fp-ts/lib/TraversableWithIndex"

import type { ReadonlyRecord } from "./ReadonlyRecord"
import { URI } from "./URI"
import { empty } from "./empty"

export const traverseWithIndex_: TraverseWithIndex1<URI, string> = <F>(
  F: Applicative<F>
) => <A, B>(ta: ReadonlyRecord<string, A>, f: (k: string, a: A) => HKT<F, B>) => {
  const keys = Object.keys(ta)
  if (keys.length === 0) {
    return F.of(empty)
  }
  let fr: HKT<F, Record<string, B>> = F.of({})
  for (const key of keys) {
    fr = F.ap(
      F.map(fr, (r) => (b: B) => {
        r[key] = b
        return r
      }),
      f(key, ta[key])
    )
  }
  return fr
}
