import type { Option } from "../Option"
import { wither } from "../Record/wither"
import type { Effect } from "../Support/Common/effect"

import { effect } from "./effect"

export const witherRecord_ = wither(effect)

export const witherRecord: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, Option<B>>
) => (ta: Record<string, A>) => Effect<S, R, E, Record<string, B>> = (f) => (ta) =>
  witherRecord_(ta, f)
