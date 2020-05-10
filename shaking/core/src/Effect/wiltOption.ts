import type { Separated } from "fp-ts/lib/Compactable"

import { Either } from "../Either"
import { Option, option } from "../Option"
import { Effect } from "../Support/Common/effect"

import { effect } from "./effect"

export const wiltOption: <A, S, R, E, B, C>(
  f: (a: A) => Effect<S, R, E, Either<B, C>>
) => (wa: Option<A>) => Effect<S, R, E, Separated<Option<B>, Option<C>>> = (f) => (
  wa
) => option.wilt(effect)(wa, f)
