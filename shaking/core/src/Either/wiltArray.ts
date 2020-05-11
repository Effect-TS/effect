import type { Separated } from "fp-ts/lib/Compactable"

import { array } from "../Array"

import type { Either } from "./Either"
import { eitherMonad } from "./eitherMonad"

export const wiltArray_ = array.wilt(eitherMonad)

export const wiltArray: <A, E, B, C>(
  f: (a: A) => Either<E, Either<B, C>>
) => (wa: Array<A>) => Either<E, Separated<Array<B>, Array<C>>> = (f) => (wa) =>
  wiltArray_(wa, f)
