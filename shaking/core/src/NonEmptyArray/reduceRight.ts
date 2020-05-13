import { reduceRight as reduceRight_1 } from "../Readonly/NonEmptyArray/reduceRight"

import type { NonEmptyArray } from "./NonEmptyArray"

export const reduceRight: <A, B>(
  b: B,
  f: (a: A, b: B) => B
) => (fa: NonEmptyArray<A>) => B = reduceRight_1 as any
