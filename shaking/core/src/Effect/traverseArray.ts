import { traverse_ } from "../Array/array"
import type { Effect } from "../Support/Common/effect"

import { effect } from "./effect"

export const traverseArray_ = traverse_(effect)

export const traverseArray: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (ta: Array<A>) => Effect<S, R, E, Array<B>> = (f) => (ta) => traverseArray_(ta, f)
