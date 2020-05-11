import type { Separated } from "fp-ts/lib/Compactable"

import type { Option } from "../Option/Option"
import { wilt } from "../Option/wilt"

import type { Either } from "./Either"
import { eitherMonadClassic } from "./eitherMonadClassic"

export const wiltOption_ = wilt(eitherMonadClassic)

export const wiltOption: <A, E, B, C>(
  f: (a: A) => Either<E, Either<B, C>>
) => (wa: Option<A>) => Either<E, Separated<Option<B>, Option<C>>> = (f) => (wa) =>
  wiltOption_(wa, f)
