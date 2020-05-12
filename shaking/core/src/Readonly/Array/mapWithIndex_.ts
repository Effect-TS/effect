export const mapWithIndex_: <A, B>(
  fa: readonly A[],
  f: (i: number, a: A) => B
) => readonly B[] = (fa, f) => fa.map((a, i) => f(i, a))
