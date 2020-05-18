import { traverse_ } from "../Array/array"
import type { Effect, AsyncRE } from "../Support/Common/effect"

import { parEffect } from "./effect"

export const parTraverseArray_ =
  /*#__PURE__*/
  (() => traverse_(parEffect))()

export const parTraverseArray: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (ta: Array<A>) => AsyncRE<R, E, Array<B>> = (f) => (ta) => parTraverseArray_(ta, f)
