import type { Separated } from "fp-ts/lib/Compactable"

import { wilt_ } from "../Array"

import { Either, eitherMonad } from "./either"

export const wiltArray_ = wilt_(eitherMonad)

export const wiltArray: <A, E, B, C>(
  f: (a: A) => Either<E, Either<B, C>>
) => (wa: Array<A>) => Either<E, Separated<Array<B>, Array<C>>> = (f) => (wa) =>
  wiltArray_(wa, f)
