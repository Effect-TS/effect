import type { Separated } from "fp-ts/lib/Compactable"
import type { Option } from "fp-ts/lib/Option"

import { array } from "../Array"
import { Either } from "../Either"

import { optionMonad } from "./monad"

export const wiltArray_ = array.wilt(optionMonad)

export const wiltArray: <A, B, C>(
  f: (a: A) => Option<Either<B, C>>
) => (wa: Array<A>) => Option<Separated<Array<B>, Array<C>>> = (f) => (wa) =>
  wiltArray_(wa, f)
