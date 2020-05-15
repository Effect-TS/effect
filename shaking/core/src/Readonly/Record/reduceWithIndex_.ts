export const reduceWithIndex_: <A, B>(
  fa: Readonly<Record<string, A>>,
  b: B,
  f: (i: string, b: B, a: A) => B
) => B = (fa, b, f) => {
  let out = b
  const keys = Object.keys(fa).sort()
  const len = keys.length
  for (let i = 0; i < len; i++) {
    const k = keys[i]
    out = f(k, out, fa[k])
  }
  return out
}
