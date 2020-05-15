export const reduceRightWithIndex_: <A, B>(
  fa: Readonly<Record<string, A>>,
  b: B,
  f: (i: string, a: A, b: B) => B
) => B = (fa, b, f) => {
  let out = b
  const keys = Object.keys(fa).sort()
  const len = keys.length
  for (let i = len - 1; i >= 0; i--) {
    const k = keys[i]
    out = f(k, fa[k], out)
  }
  return out
}
