import { tree, Tree } from "fp-ts/lib/Tree"

import { Effect } from "../Support/Common/effect"

import { effect } from "./effect"

export const traverseTree_ = tree.traverse(effect)

export const traverseTree: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (ta: Tree<A>) => Effect<S, R, E, Tree<B>> = (f) => (ta) => traverseTree_(ta, f)
