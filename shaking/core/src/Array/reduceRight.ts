import { reduceRight as reduceRight_1 } from "../Readonly/Array/reduceRight"

export const reduceRight: <A, B>(
  b: B,
  f: (a: A, b: B) => B
) => (fa: A[]) => B = reduceRight_1 as any
