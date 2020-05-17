import type { Effect } from "../Support/Common/effect"
import { traverse_, Tree } from "../Tree"

import { effect } from "./effect"

export const traverseTree_ = traverse_(effect)

export const traverseTree: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (ta: Tree<A>) => Effect<S, R, E, Tree<B>> = (f) => (ta) => traverseTree_(ta, f)
