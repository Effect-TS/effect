import type { Option } from "../Option"
import { wither } from "../Record/wither"
import type { Effect, AsyncRE } from "../Support/Common/effect"

import { parEffect } from "./parEffect"

export const parWitherRecord_ = wither(parEffect)

export const parWitherRecord: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, Option<B>>
) => (ta: Record<string, A>) => AsyncRE<R, E, Record<string, B>> = (f) => (ta) =>
  parWitherRecord_(ta, f)
