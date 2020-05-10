import { Option, option } from "fp-ts/lib/Option"

import { Effect } from "../Support/Common/effect"

import { effect } from "./effect"

export const witherOption: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, Option<B>>
) => (ta: Option<A>) => Effect<S, R, E, Option<B>> = (f) => (ta) =>
  option.wither(effect)(ta, f)
