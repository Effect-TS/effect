import { traverseWithIndex_ } from "../Array/array"
import { Effect } from "../Support/Common/effect"

import { effect } from "./effect"

export const traverseArrayWithIndex_ = traverseWithIndex_(effect)

export const traverseArrayWithIndex: <A, S, R, E, B>(
  f: (i: number, a: A) => Effect<S, R, E, B>
) => (ta: Array<A>) => Effect<S, R, E, Array<B>> = (f) => (ta) =>
  traverseArrayWithIndex_(ta, f)
