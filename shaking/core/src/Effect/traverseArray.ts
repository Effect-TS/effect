import { traverse } from "../Array"
import { Effect } from "../Support/Common/effect"

import { effect } from "./effect"

export const traverseArray: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (ta: Array<A>) => Effect<S, R, E, Array<B>> = (f) => (ta) =>
  traverse(effect)(ta, f)
