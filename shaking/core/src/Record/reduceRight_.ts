import { reduceRight_ as reduceRight__1 } from "../Readonly/Record"

export const reduceRight_: <A, B>(
  fa: Record<string, A>,
  b: B,
  f: (a: A, b: B) => B
) => B = reduceRight__1
