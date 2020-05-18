import type { Option } from "../Option"
import { wither_ } from "../Record"
import type { Effect, AsyncRE } from "../Support/Common/effect"

import { parFastEffect } from "./parFastEffect"

export const parFastWitherRecord_ =
  /*#__PURE__*/
  (() => wither_(parFastEffect))()

export const parFastWitherRecord: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, Option<B>>
) => (ta: Record<string, A>) => AsyncRE<R, E, Record<string, B>> = (f) => (ta) =>
  parFastWitherRecord_(ta, f)
