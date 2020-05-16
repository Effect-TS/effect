import { empty } from "../Array"

import type { Tree } from "./Tree"

export const of_: <A>(a: A) => Tree<A> = (a) => ({
  value: a,
  forest: empty
})
