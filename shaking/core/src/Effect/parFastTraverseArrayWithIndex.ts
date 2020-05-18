import { traverseWithIndex_ } from "../Array/array"
import { Effect, AsyncRE } from "../Support/Common/effect"

import { parFastEffect } from "./effect"

export const parFastTraverseArrayWithIndex_ =
  /*#__PURE__*/
  (() => traverseWithIndex_(parFastEffect))()

export const parFastTraverseArrayWithIndex: <A, S, R, E, B>(
  f: (i: number, a: A) => Effect<S, R, E, B>
) => (ta: Array<A>) => AsyncRE<R, E, Array<B>> = (f) => (ta) =>
  parFastTraverseArrayWithIndex_(ta, f)
