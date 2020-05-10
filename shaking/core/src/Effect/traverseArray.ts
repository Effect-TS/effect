import { array } from "fp-ts/lib/Array"

import { Effect } from "../Support/Common/effect"

import { effect } from "./effect"

export const traverseArray: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (ta: Array<A>) => Effect<S, R, E, Array<B>> = (f) => (ta) =>
  array.traverse(effect)(ta, f)
