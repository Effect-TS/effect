import type { Tree } from "./Tree"
import { map_ } from "./map_"

export const map: <A, B>(f: (a: A) => B) => (fa: Tree<A>) => Tree<B> = (f) => (fa) =>
  map_(fa, f)
