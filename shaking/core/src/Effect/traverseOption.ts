import { traverse_, Option } from "../Option/option"
import type { Effect } from "../Support/Common/effect"

import { effect } from "./effect"

export const traverseOption_ = traverse_(effect)

export const traverseOption: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (ta: Option<A>) => Effect<S, R, E, Option<B>> = (f) => (ta) =>
  traverseOption_(ta, f)
