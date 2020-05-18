import type { Separated } from "fp-ts/lib/Compactable"

import { wilt_ } from "../Record/record"

import { eitherMonad, Either } from "./either"

export const wiltRecord_ =
  /*#__PURE__*/
  (() => wilt_(eitherMonad))()

export const wiltRecord: <A, E, B, C>(
  f: (a: A) => Either<E, Either<B, C>>
) => (
  wa: Record<string, A>
) => Either<E, Separated<Record<string, B>, Record<string, C>>> = (f) => (wa) =>
  wiltRecord_(wa, f)
