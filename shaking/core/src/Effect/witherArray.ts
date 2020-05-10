import { array } from "fp-ts/lib/Array"
import { Option } from "fp-ts/lib/Option"

import { Effect } from "../Support/Common/effect"

import { effect } from "./effect"

export const witherArray: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, Option<B>>
) => (ta: Array<A>) => Effect<S, R, E, Array<B>> = (f) => (ta) =>
  array.wither(effect)(ta, f)
