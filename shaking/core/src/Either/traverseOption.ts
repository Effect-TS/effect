import { Option, traverse_ } from "../Option/option"

import { Either, eitherMonad } from "./either"

export const traverseOption_ =
  /*#__PURE__*/
  (() => traverse_(eitherMonad))()

export const traverseOption: <A, E, B>(
  f: (a: A) => Either<E, B>
) => (ta: Option<A>) => Either<E, Option<B>> = (f) => (ta) => traverseOption_(ta, f)
