import { traverseWithIndex } from "../Array"
import { Effect, AsyncRE } from "../Support/Common/effect"

import { parEffect } from "./parEffect"

export const parTraverseArrayWithIndex_ = traverseWithIndex(parEffect)

export const parTraverseArrayWithIndex: <A, S, R, E, B>(
  f: (i: number, a: A) => Effect<S, R, E, B>
) => (ta: Array<A>) => AsyncRE<R, E, Array<B>> = (f) => (ta) =>
  parTraverseArrayWithIndex_(ta, f)
