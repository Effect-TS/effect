import { Tree, traverse_ } from "../Tree"

import { Either, eitherMonad } from "./either"

export const traverseTree_ =
  /*#__PURE__*/
  (() => traverse_(eitherMonad))()

export const traverseTree: <A, E, B>(
  f: (a: A) => Either<E, B>
) => (ta: Tree<A>) => Either<E, Tree<B>> = (f) => (ta) => traverseTree_(ta, f)
