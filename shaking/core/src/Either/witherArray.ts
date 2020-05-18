import { wither_ } from "../Array"
import type { Option } from "../Option/option"

import { eitherMonad, Either } from "./either"

export const witherArray_ =
  /*#__PURE__*/
  (() => wither_(eitherMonad))()

export const witherArray: <A, E, B>(
  f: (a: A) => Either<E, Option<B>>
) => (ta: Array<A>) => Either<E, Array<B>> = (f) => (ta) => witherArray_(ta, f)
