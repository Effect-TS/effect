import { reduceRight_ as reduceRight__1 } from "../Readonly/Array/reduceRight_"

export const reduceRight_: <A, B>(
  fa: A[],
  b: B,
  f: (a: A, b: B) => B
) => B = reduceRight__1 as any
