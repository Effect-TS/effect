import { traverseWithIndex_ } from "../Record/traverseWithIndex_"
import { Effect, AsyncRE } from "../Support/Common/effect"

import { parFastEffect } from "./parFastEffect"

export const parFastTraverseRecordWithIndex_ = traverseWithIndex_(parFastEffect)

export const parFastTraverseRecordWithIndex: <A, S, R, E, B>(
  f: (k: string, a: A) => Effect<S, R, E, B>
) => (ta: Record<string, A>) => AsyncRE<R, E, Record<string, B>> = (f) => (ta) =>
  parFastTraverseRecordWithIndex_(ta, f)
