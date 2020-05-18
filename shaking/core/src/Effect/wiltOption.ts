import type { Separated } from "fp-ts/lib/Compactable"

import type { Either } from "../Either/either"
import { wilt_, Option } from "../Option/option"
import type { Effect } from "../Support/Common/effect"

import { effect } from "./effect"

export const wiltOption_ = wilt_(effect)

export const wiltOption: <A, S, R, E, B, C>(
  f: (a: A) => Effect<S, R, E, Either<B, C>>
) => (wa: Option<A>) => Effect<S, R, E, Separated<Option<B>, Option<C>>> = (f) => (
  wa
) => wiltOption_(wa, f)
