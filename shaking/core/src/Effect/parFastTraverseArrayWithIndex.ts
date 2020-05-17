import { traverseWithIndex_ } from "../Array/array"
import { Effect, AsyncRE } from "../Support/Common/effect"

import { parFastEffect } from "./parFastEffect"

export const parFastTraverseArrayWithIndex_ = traverseWithIndex_(parFastEffect)

export const parFastTraverseArrayWithIndex: <A, S, R, E, B>(
  f: (i: number, a: A) => Effect<S, R, E, B>
) => (ta: Array<A>) => AsyncRE<R, E, Array<B>> = (f) => (ta) =>
  parFastTraverseArrayWithIndex_(ta, f)
