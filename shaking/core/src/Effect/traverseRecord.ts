import { traverse_ } from "../Record"
import type { Effect } from "../Support/Common/effect"

import { effect } from "./effect"

export const traverseRecord_ = traverse_(effect)

export const traverseRecord: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (ta: Record<string, A>) => Effect<S, R, E, Record<string, B>> = (f) => (ta) =>
  traverseRecord_(ta, f)
