import { tree, Tree } from "fp-ts/lib/Tree"

import { Effect, AsyncRE } from "../Support/Common/effect"

import { parFastEffect } from "./parFastEffect"

export const parFastTraverseTree_ = tree.traverse(parFastEffect)

export const parFastTraverseTree: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (ta: Tree<A>) => AsyncRE<R, E, Tree<B>> = (f) => (ta) =>
  parFastTraverseTree_(ta, f)
