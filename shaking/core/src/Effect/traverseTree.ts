import type { Effect } from "../Support/Common/effect"
import type { Tree } from "../Tree"
import { traverse } from "../Tree/traverse"

import { effect } from "./effect"

export const traverseTree_ = traverse(effect)

export const traverseTree: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (ta: Tree<A>) => Effect<S, R, E, Tree<B>> = (f) => (ta) => traverseTree_(ta, f)
