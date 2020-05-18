import { traverse_ } from "../Array"

import { Either, eitherMonad } from "./either"

export const traverseArray_ =
  /*#__PURE__*/
  (() => traverse_(eitherMonad))()

export const traverseArray: <A, E, B>(
  f: (a: A) => Either<E, B>
) => (ta: Array<A>) => Either<E, Array<B>> = (f) => (ta) => traverseArray_(ta, f)
