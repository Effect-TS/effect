import { wither } from "../Array"
import { Option } from "../Option"
import { Effect } from "../Support/Common/effect"

import { effect } from "./effect"

export const witherArray_ = wither(effect)

export const witherArray: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, Option<B>>
) => (ta: Array<A>) => Effect<S, R, E, Array<B>> = (f) => (ta) => witherArray_(ta, f)
