import { reduceRight_ as reduceRight__1 } from "../Array"

import { ReadonlyNonEmptyArray } from "./ReadonlyNonEmptyArray"

export const reduceRight_: <A, B>(
  fa: ReadonlyNonEmptyArray<A>,
  b: B,
  f: (a: A, b: B) => B
) => B = reduceRight__1 as any
