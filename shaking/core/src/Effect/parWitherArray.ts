import { wither_ } from "../Array/array"
import type { Option } from "../Option/option"
import type { AsyncRE } from "../Support/Common/effect"

import { parEffect } from "./parEffect"

export const parWitherArray_ =
  /*#__PURE__*/
  (() => wither_(parEffect))()

export const parWitherArray: <A, R, E, B>(
  f: (a: A) => AsyncRE<R, E, Option<B>>
) => (ta: Array<A>) => AsyncRE<R, E, Array<B>> = (f) => (ta) => parWitherArray_(ta, f)
