import type { Tree } from "./Tree"
import { extend_ } from "./extend_"

export const duplicate: <A>(ma: Tree<A>) => Tree<Tree<A>> = (ma) =>
  extend_(ma, (x) => x)
