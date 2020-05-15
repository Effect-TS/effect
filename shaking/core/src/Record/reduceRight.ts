import { reduceRight as reduceRight_1 } from "../Readonly/Record"

export const reduceRight: <A, B>(
  b: B,
  f: (a: A, b: B) => B
) => (fa: Record<string, A>) => B = reduceRight_1
