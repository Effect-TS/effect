import { wither_, Option } from "../Option/option"

import { eitherMonad, Either } from "./either"

export const witherOption_ =
  /*#__PURE__*/
  (() => wither_(eitherMonad))()

export const witherOption: <A, E, B>(
  f: (a: A) => Either<E, Option<B>>
) => (ta: Option<A>) => Either<E, Option<B>> = (f) => (ta) => witherOption_(ta, f)
