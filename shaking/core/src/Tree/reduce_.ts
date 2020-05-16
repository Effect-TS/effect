import type { Tree } from "./Tree"

export const reduce_ = <A, B>(fa: Tree<A>, b: B, f: (b: B, a: A) => B): B => {
  let r: B = f(b, fa.value)
  const len = fa.forest.length
  for (let i = 0; i < len; i++) {
    r = reduce_(fa.forest[i], r, f)
  }
  return r
}
