import type { Separated } from "fp-ts/lib/Compactable"

import { wilt_, Option } from "../Option/option"

import type { Either } from "./Either"
import { eitherMonadClassic } from "./eitherMonadClassic"

export const wiltOption_ = wilt_(eitherMonadClassic)

export const wiltOption: <A, E, B, C>(
  f: (a: A) => Either<E, Either<B, C>>
) => (wa: Option<A>) => Either<E, Separated<Option<B>, Option<C>>> = (f) => (wa) =>
  wiltOption_(wa, f)
