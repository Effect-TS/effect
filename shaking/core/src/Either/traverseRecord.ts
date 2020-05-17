import { record } from "../Record/record"

import type { Either } from "./Either"
import { eitherMonad } from "./eitherMonad"

export const traverseRecord_ = record.traverse(eitherMonad)

export const traverseRecord: <A, E, B>(
  f: (a: A) => Either<E, B>
) => (ta: Record<string, A>) => Either<E, Record<string, B>> = (f) => (ta) =>
  traverseRecord_(ta, f)
