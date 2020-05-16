import type { Tree } from "./Tree"

export const map_: <A, B>(fa: Tree<A>, f: (a: A) => B) => Tree<B> = (fa, f) => ({
  value: f(fa.value),
  forest: fa.forest.map((t) => map_(t, f))
})
