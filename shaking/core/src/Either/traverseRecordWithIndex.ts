import { traverseWithIndex_ } from "../Record/record"

import { Either, eitherMonad } from "./either"

export const traverseRecordWithIndex_ =
  /*#__PURE__*/
  (() => traverseWithIndex_(eitherMonad))()

export const traverseRecordWithIndex: <A, E, B>(
  f: (k: string, a: A) => Either<E, B>
) => (ta: Record<string, A>) => Either<E, Record<string, B>> = (f) => (ta) =>
  traverseRecordWithIndex_(ta, f)
