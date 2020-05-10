import { Option, option } from "fp-ts/lib/Option"

import { Effect } from "../Support/Common/effect"

import { effect } from "./effect"

export const traverseOption: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (ta: Option<A>) => Effect<S, R, E, Option<B>> = (f) => (ta) =>
  option.traverse(effect)(ta, f)
