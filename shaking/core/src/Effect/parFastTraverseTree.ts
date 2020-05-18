import type { Effect, AsyncRE } from "../Support/Common/effect"
import { traverse_, Tree } from "../Tree"

import { parFastEffect } from "./effect"

export const parFastTraverseTree_ =
  /*#__PURE__*/
  (() => traverse_(parFastEffect))()

export const parFastTraverseTree: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (ta: Tree<A>) => AsyncRE<R, E, Tree<B>> = (f) => (ta) =>
  parFastTraverseTree_(ta, f)
