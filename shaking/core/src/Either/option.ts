import { Separated } from "fp-ts/lib/Compactable"
import { Either } from "fp-ts/lib/Either"
import { Option } from "fp-ts/lib/Option"

import { option } from "../Option/instances"

import { either } from "./either"

export const sequenceOption = option.sequence(either)
export const traverseOption: <A, E, B>(
  f: (a: A) => Either<E, B>
) => (ta: Option<A>) => Either<E, Option<B>> = (f) => (ta) =>
  option.traverse(either)(ta, f)
export const wiltOption: <A, E, B, C>(
  f: (a: A) => Either<E, Either<B, C>>
) => (wa: Option<A>) => Either<E, Separated<Option<B>, Option<C>>> = (f) => (wa) =>
  option.wilt(either)(wa, f)
export const witherOption: <A, E, B>(
  f: (a: A) => Either<E, Option<B>>
) => (ta: Option<A>) => Either<E, Option<B>> = (f) => (ta) =>
  option.wither(either)(ta, f)
