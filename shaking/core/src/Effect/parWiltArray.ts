import { array } from "fp-ts/lib/Array"
import type { Separated } from "fp-ts/lib/Compactable"
import type { Either } from "fp-ts/lib/Either"

import type { AsyncRE } from "../Support/Common/effect"

import { parEffect } from "./parEffect"

export const parWiltArray: <A, R, E, B, C>(
  f: (a: A) => AsyncRE<R, E, Either<B, C>>
) => (wa: Array<A>) => AsyncRE<R, E, Separated<Array<B>, Array<C>>> = (f) => (wa) =>
  array.wilt(parEffect)(wa, f)
