import type { Separated } from "fp-ts/lib/Compactable"

import { wilt_ } from "../Array"
import type { Either } from "../Either/either"
import type { AsyncRE } from "../Support/Common/effect"

import { parEffect } from "./parEffect"

export const parWiltArray_ = wilt_(parEffect)

export const parWiltArray: <A, R, E, B, C>(
  f: (a: A) => AsyncRE<R, E, Either<B, C>>
) => (wa: Array<A>) => AsyncRE<R, E, Separated<Array<B>, Array<C>>> = (f) => (wa) =>
  parWiltArray_(wa, f)
