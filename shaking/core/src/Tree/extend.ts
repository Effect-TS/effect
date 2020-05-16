import type { Tree } from "./Tree"
import { extend_ } from "./extend_"

export const extend: <A, B>(f: (fa: Tree<A>) => B) => (ma: Tree<A>) => Tree<B> = (
  f
) => (ma) => extend_(ma, f)
