export const map_: <A, B>(fa: readonly A[], f: (a: A) => B) => readonly B[] = (fa, f) =>
  fa.map((a) => f(a))
