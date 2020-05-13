import type { Separated } from "fp-ts/lib/Compactable"

import { wilt } from "../Array"
import type { Either } from "../Either/Either"
import type { Effect } from "../Support/Common/effect"

import { effect } from "./effect"

export const wiltArray: <A, S, R, E, B, C>(
  f: (a: A) => Effect<S, R, E, Either<B, C>>
) => (wa: Array<A>) => Effect<S, R, E, Separated<Array<B>, Array<C>>> = (f) => (wa) =>
  wilt(effect)(wa, f)
