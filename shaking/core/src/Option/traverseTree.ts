import type { Option } from "fp-ts/lib/Option"

import { tree, Tree } from "../Tree"

import { option } from "./instances"

export const traverseTree: <A, B>(
  f: (a: A) => Option<B>
) => (ta: Tree<A>) => Option<Tree<B>> = (f) => (ta) => tree.traverse(option)(ta, f)
