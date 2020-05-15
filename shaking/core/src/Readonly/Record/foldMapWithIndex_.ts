import type { Monoid } from "../../Monoid"

export const foldMapWithIndex_: <M>(
  M: Monoid<M>
) => <A>(fa: Readonly<Record<string, A>>, f: (i: string, a: A) => M) => M = (M) => (
  fa,
  f
) => {
  let out = M.empty
  const keys = Object.keys(fa).sort()
  const len = keys.length
  for (let i = 0; i < len; i++) {
    const k = keys[i]
    out = M.concat(out, f(k, fa[k]))
  }
  return out
}
