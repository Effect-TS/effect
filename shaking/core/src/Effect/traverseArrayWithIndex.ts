import { traverseWithIndex } from "../Array"
import { Effect } from "../Support/Common/effect"

import { effect } from "./effect"

export const traverseArrayWithIndex: <A, S, R, E, B>(
  f: (i: number, a: A) => Effect<S, R, E, B>
) => (ta: Array<A>) => Effect<S, R, E, Array<B>> = (f) => (ta) =>
  traverseWithIndex(effect)(ta, f)
