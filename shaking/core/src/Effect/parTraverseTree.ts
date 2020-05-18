import type { Effect, AsyncRE } from "../Support/Common/effect"
import { traverse_ } from "../Tree"
import type { Tree } from "../Tree"

import { parEffect } from "./effect"

export const parTraverseTree_ =
  /*#__PURE__*/
  (() => traverse_(parEffect))()

export const parTraverseTree: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (ta: Tree<A>) => AsyncRE<R, E, Tree<B>> = (f) => (ta) => parTraverseTree_(ta, f)
