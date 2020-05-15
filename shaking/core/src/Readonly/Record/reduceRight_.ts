import { reduceRightWithIndex_ } from "./reduceRightWithIndex_"

export const reduceRight_: <A, B>(
  fa: Readonly<Record<string, A>>,
  b: B,
  f: (a: A, b: B) => B
) => B = (fa, b, f) => reduceRightWithIndex_(fa, b, (_, a, b) => f(a, b))
