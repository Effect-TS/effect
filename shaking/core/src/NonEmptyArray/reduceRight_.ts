import { reduceRight_ as reduceRight__1 } from "../Readonly/NonEmptyArray/reduceRight_"

import type { NonEmptyArray } from "./NonEmptyArray"

export const reduceRight_: <A, B>(
  fa: NonEmptyArray<A>,
  b: B,
  f: (a: A, b: B) => B
) => B = reduceRight__1 as any
