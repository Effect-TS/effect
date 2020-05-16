import type { Tree } from "./Tree"

export const reduceRight_ = <A, B>(fa: Tree<A>, b: B, f: (a: A, b: B) => B): B => {
  let r: B = b
  const len = fa.forest.length
  for (let i = len - 1; i >= 0; i--) {
    r = reduceRight_(fa.forest[i], r, f)
  }
  return f(fa.value, r)
}
