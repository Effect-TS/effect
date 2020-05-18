import { traverse_ } from "../Record/record"

import { eitherMonad, Either } from "./either"

export const traverseRecord_ =
  /*#__PURE__*/
  (() => traverse_(eitherMonad))()

export const traverseRecord: <A, E, B>(
  f: (a: A) => Either<E, B>
) => (ta: Record<string, A>) => Either<E, Record<string, B>> = (f) => (ta) =>
  traverseRecord_(ta, f)
