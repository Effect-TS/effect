import { array } from "fp-ts/lib/Array"
import { Separated } from "fp-ts/lib/Compactable"
import { Either } from "fp-ts/lib/Either"

import { AsyncRE } from "../Support/Common/effect"

import { parEffect } from "./parEffect"

export const parWiltArray: <A, R, E, B, C>(
  f: (a: A) => AsyncRE<R, E, Either<B, C>>
) => (wa: Array<A>) => AsyncRE<R, E, Separated<Array<B>, Array<C>>> = (f) => (wa) =>
  array.wilt(parEffect)(wa, f)
