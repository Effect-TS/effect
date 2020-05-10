import { Option } from "../Option"
import { record } from "../Record"
import { Effect } from "../Support/Common/effect"

import { effect } from "./effect"

export const witherRecord: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, Option<B>>
) => (ta: Record<string, A>) => Effect<S, R, E, Record<string, B>> = (f) => (ta) =>
  record.wither(effect)(ta, f)
