import type { Option } from "../Option/Option"
import { traverse } from "../Option/traverse"
import type { Effect } from "../Support/Common/effect"

import { effect } from "./effect"

export const traverseOption: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (ta: Option<A>) => Effect<S, R, E, Option<B>> = (f) => (ta) =>
  traverse(effect)(ta, f)
