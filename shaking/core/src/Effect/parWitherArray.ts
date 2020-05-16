import { wither } from "../Array/wither"
import type { Option } from "../Option/Option"
import type { AsyncRE } from "../Support/Common/effect"

import { parEffect } from "./parEffect"

export const parWitherArray_ = wither(parEffect)

export const parWitherArray: <A, R, E, B>(
  f: (a: A) => AsyncRE<R, E, Option<B>>
) => (ta: Array<A>) => AsyncRE<R, E, Array<B>> = (f) => (ta) => parWitherArray_(ta, f)
