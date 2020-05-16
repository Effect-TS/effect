import type { Option } from "../Option"
import { wither } from "../Record/wither"
import type { Effect, AsyncRE } from "../Support/Common/effect"

import { parFastEffect } from "./parFastEffect"

export const parFastWitherRecord_ = wither(parFastEffect)

export const parFastWitherRecord: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, Option<B>>
) => (ta: Record<string, A>) => AsyncRE<R, E, Record<string, B>> = (f) => (ta) =>
  parFastWitherRecord_(ta, f)
