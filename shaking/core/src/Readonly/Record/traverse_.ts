import type { Applicative } from "fp-ts/lib/Applicative"
import type { HKT } from "fp-ts/lib/HKT"

import type { ReadonlyRecord } from "./ReadonlyRecord"
import { traverseWithIndex_ } from "./traverseWithIndex_"

export const traverse_ = <F>(
  F: Applicative<F>
): (<A, B>(
  ta: ReadonlyRecord<string, A>,
  f: (a: A) => HKT<F, B>
) => HKT<F, ReadonlyRecord<string, B>>) => {
  const traverseWithIndexF = traverseWithIndex_(F)
  return (ta, f) => traverseWithIndexF(ta, (_, a) => f(a))
}
