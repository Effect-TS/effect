export const reduceWithIndex_: <A, B>(
  fa: readonly A[],
  b: B,
  f: (i: number, b: B, a: A) => B
) => B = (fa, b, f) => {
  const l = fa.length
  let r = b
  for (let i = 0; i < l; i++) {
    r = f(i, r, fa[i])
  }
  return r
}
