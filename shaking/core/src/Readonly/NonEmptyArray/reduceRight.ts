import { reduceRight as reduceRight_1 } from "../Array"

import { ReadonlyNonEmptyArray } from "./ReadonlyNonEmptyArray"

export const reduceRight: <A, B>(
  b: B,
  f: (a: A, b: B) => B
) => (fa: ReadonlyNonEmptyArray<A>) => B = reduceRight_1 as any
