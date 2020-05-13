import type { Option } from "../Option/Option"
import { wither } from "../Option/wither"
import type { Effect } from "../Support/Common/effect"

import { effect } from "./effect"

export const witherOption_ = wither(effect)

export const witherOption: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, Option<B>>
) => (ta: Option<A>) => Effect<S, R, E, Option<B>> = (f) => (ta) => witherOption_(ta, f)
