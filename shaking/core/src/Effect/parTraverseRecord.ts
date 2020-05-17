import { traverse_ } from "../Record"
import { Effect, AsyncRE } from "../Support/Common/effect"

import { parEffect } from "./parEffect"

export const parTraverseRecord_ = traverse_(parEffect)

export const parTraverseRecord: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (ta: Record<string, A>) => AsyncRE<R, E, Record<string, B>> = (f) => (ta) =>
  parTraverseRecord_(ta, f)
