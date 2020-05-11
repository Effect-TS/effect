import { record } from "../Record"

import type { Either } from "./Either"
import { eitherMonad } from "./eitherMonad"

export const traverseRecordWithIndex_ = record.traverseWithIndex(eitherMonad)

export const traverseRecordWithIndex: <A, E, B>(
  f: (k: string, a: A) => Either<E, B>
) => (ta: Record<string, A>) => Either<E, Record<string, B>> = (f) => (ta) =>
  traverseRecordWithIndex_(ta, f)
