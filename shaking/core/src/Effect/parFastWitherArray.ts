import { array } from "fp-ts/lib/Array"
import { Option } from "fp-ts/lib/Option"

import { AsyncRE } from "../Support/Common/effect"

import { parFastEffect } from "./parFastEffect"

export const parFastWitherArray: <A, R, E, B>(
  f: (a: A) => AsyncRE<R, E, Option<B>>
) => (ta: Array<A>) => AsyncRE<R, E, Array<B>> = (f) => (ta) =>
  array.wither(parFastEffect)(ta, f)
