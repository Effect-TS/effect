import { array } from "fp-ts/lib/Array"

import { Effect, AsyncRE } from "../Support/Common/effect"

import { parEffect } from "./parEffect"

export const parTraverseArray: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (ta: Array<A>) => AsyncRE<R, E, Array<B>> = (f) => (ta) =>
  array.traverse(parEffect)(ta, f)
