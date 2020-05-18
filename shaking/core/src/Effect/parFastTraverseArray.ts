import { traverse_ } from "../Array"
import { Effect, AsyncRE } from "../Support/Common/effect"

import { parFastEffect } from "./parFastEffect"

export const parFastTraverseArray_ =
  /*#__PURE__*/
  (() => traverse_(parFastEffect))()

export const parFastTraverseArray: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (ta: Array<A>) => AsyncRE<R, E, Array<B>> = (f) => (ta) =>
  traverse_(parFastEffect)(ta, f)
