export const reduceRightWithIndex_: <A, B>(
  fa: readonly A[],
  b: B,
  f: (i: number, a: A, b: B) => B
) => B = (fa, b, f) => fa.reduceRight((b, a, i) => f(i, a, b), b)
