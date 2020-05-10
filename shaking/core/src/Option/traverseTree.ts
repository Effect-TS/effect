import type { Option } from "fp-ts/lib/Option"

import { tree, Tree } from "../Tree"

import { optionMonad } from "./monad"

export const traverseTree_ = tree.traverse(optionMonad)

export const traverseTree: <A, B>(
  f: (a: A) => Option<B>
) => (ta: Tree<A>) => Option<Tree<B>> = (f) => (ta) => traverseTree_(ta, f)
