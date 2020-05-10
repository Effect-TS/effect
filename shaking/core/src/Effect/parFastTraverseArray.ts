import { array } from "fp-ts/lib/Array"

import { Effect, AsyncRE } from "../Support/Common/effect"

import { parFastEffect } from "./parFastEffect"

export const parFastTraverseArray: <A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, B>
) => (ta: Array<A>) => AsyncRE<R, E, Array<B>> = (f) => (ta) =>
  array.traverse(parFastEffect)(ta, f)
