import { tree, Tree } from "../Tree"

import type { Either } from "./Either"
import { eitherMonad } from "./eitherMonad"

export const traverseTree_ = tree.traverse(eitherMonad)

export const traverseTree: <A, E, B>(
  f: (a: A) => Either<E, B>
) => (ta: Tree<A>) => Either<E, Tree<B>> = (f) => (ta) => traverseTree_(ta, f)
