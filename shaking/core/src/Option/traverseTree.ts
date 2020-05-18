import type { Option } from "fp-ts/lib/Option"

import { traverse_, Tree } from "../Tree"

import { optionMonad } from "./option"

export const traverseTree_ =
  /*#__PURE__*/
  (() => traverse_(optionMonad))()

export const traverseTree: <A, B>(
  f: (a: A) => Option<B>
) => (ta: Tree<A>) => Option<Tree<B>> = (f) => (ta) => traverseTree_(ta, f)
