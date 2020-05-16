import { traverseWithIndex } from "../Array/traverseWithIndex"
import { Effect, AsyncRE } from "../Support/Common/effect"

import { parFastEffect } from "./parFastEffect"

export const parFastTraverseArrayWithIndex_ = traverseWithIndex(parFastEffect)

export const parFastTraverseArrayWithIndex: <A, S, R, E, B>(
  f: (i: number, a: A) => Effect<S, R, E, B>
) => (ta: Array<A>) => AsyncRE<R, E, Array<B>> = (f) => (ta) =>
  traverseWithIndex(parFastEffect)(ta, f)
