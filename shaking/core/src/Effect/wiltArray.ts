import { array } from "fp-ts/lib/Array"
import { Separated } from "fp-ts/lib/Compactable"
import { Either } from "fp-ts/lib/Either"

import { Effect } from "../Support/Common/effect"

import { effect } from "./effect"

export const wiltArray: <A, S, R, E, B, C>(
  f: (a: A) => Effect<S, R, E, Either<B, C>>
) => (wa: Array<A>) => Effect<S, R, E, Separated<Array<B>, Array<C>>> = (f) => (wa) =>
  array.wilt(effect)(wa, f)
