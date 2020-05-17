import type { Separated } from "fp-ts/lib/Compactable"
import type { Option } from "fp-ts/lib/Option"

import { Either } from "../Either"
import { wilt_ } from "../Record/record"

import { optionMonad } from "./monad"

export const wiltRecord_ = wilt_(optionMonad)

export const wiltRecord: <A, B, C>(
  f: (a: A) => Option<Either<B, C>>
) => (
  wa: Record<string, A>
) => Option<Separated<Record<string, B>, Record<string, C>>> = (f) => (wa) =>
  wiltRecord_(wa, f)
