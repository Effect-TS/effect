import type { Applicative } from "fp-ts/lib/Applicative"
import type { HKT } from "fp-ts/lib/HKT"
import type { Option } from "fp-ts/lib/Option"

import { isNone } from "./isNone"
import { none } from "./none"

export const wither = <F>(F: Applicative<F>) => <A, B>(
  fa: Option<A>,
  f: (a: A) => HKT<F, Option<B>>
): HKT<F, Option<B>> => (isNone(fa) ? F.of(none) : f(fa.value))
