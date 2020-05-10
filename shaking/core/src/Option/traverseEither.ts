import type { Option } from "fp-ts/lib/Option"

import { Either, either } from "../Either"

import { option } from "./instances"

export const traverseEither: <A, E, B>(
  f: (a: A) => Either<E, B>
) => (ta: Option<A>) => Either<E, Option<B>> = (f) => (ta) =>
  option.traverse(either)(ta, f)
