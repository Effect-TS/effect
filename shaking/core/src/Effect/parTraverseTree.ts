import { tree, Tree } from "fp-ts/lib/Tree"

import { Effect, AsyncRE } from "../Support/Common/effect"

import { parEffect } from "./parEffect"

export const parTraverseTree_ = tree.traverse(parEffect)

export const parTraverseTree: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (ta: Tree<A>) => AsyncRE<R, E, Tree<B>> = (f) => (ta) => parTraverseTree_(ta, f)
