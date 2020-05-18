import { wither_ } from "../Array/array"
import type { Option } from "../Option"
import type { Effect } from "../Support/Common/effect"

import { effect } from "./effect"

export const witherArray_ =
  /*#__PURE__*/
  (() => wither_(effect))()

export const witherArray: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, Option<B>>
) => (ta: Array<A>) => Effect<S, R, E, Array<B>> = (f) => (ta) => witherArray_(ta, f)
