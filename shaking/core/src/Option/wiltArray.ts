import type { Separated } from "fp-ts/lib/Compactable"
import type { Option } from "fp-ts/lib/Option"

import { wilt_ } from "../Array"
import { Either } from "../Either"

import { optionMonad } from "./option"

export const wiltArray_ = wilt_(optionMonad)

export const wiltArray: <A, B, C>(
  f: (a: A) => Option<Either<B, C>>
) => (wa: Array<A>) => Option<Separated<Array<B>, Array<C>>> = (f) => (wa) =>
  wiltArray_(wa, f)
