import type { Separated } from "fp-ts/lib/Compactable"

import { wilt_, Option } from "../Option/option"

import { eitherMonad, Either } from "./either"

export const wiltOption_ =
  /*#__PURE__*/
  (() => wilt_(eitherMonad))()

export const wiltOption: <A, E, B, C>(
  f: (a: A) => Either<E, Either<B, C>>
) => (wa: Option<A>) => Either<E, Separated<Option<B>, Option<C>>> = (f) => (wa) =>
  wiltOption_(wa, f)
