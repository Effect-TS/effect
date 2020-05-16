import type { Tree } from "./Tree"

export const extend_: <A, B>(wa: Tree<A>, f: (wa: Tree<A>) => B) => Tree<B> = (
  wa,
  f
) => ({
  value: f(wa),
  forest: wa.forest.map((t) => extend_(t, f))
})
