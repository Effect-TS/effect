export const extend_: <A, B>(
  wa: readonly A[],
  f: (wa: readonly A[]) => B
) => readonly B[] = (fa, f) => fa.map((_, i, as) => f(as.slice(i)))
