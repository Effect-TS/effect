import { reduceRight_ } from "./reduceRight_"

export const reduceRight: <A, B>(
  b: B,
  f: (a: A, b: B) => B
) => (fa: Readonly<Record<string, A>>) => B = (b, f) => (fa) => reduceRight_(fa, b, f)
