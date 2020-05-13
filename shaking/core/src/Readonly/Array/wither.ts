import type { Applicative } from "fp-ts/lib/Applicative"
import type { HKT } from "fp-ts/lib/HKT"
import type { Wither1 } from "fp-ts/lib/Witherable"

import type { Option } from "../../Option/Option"

import { URI } from "./URI"
import { compact } from "./compact"
import { traverse } from "./traverse"

export const wither: Wither1<URI> = <F>(
  F: Applicative<F>
): (<A, B>(
  ta: ReadonlyArray<A>,
  f: (a: A) => HKT<F, Option<B>>
) => HKT<F, ReadonlyArray<B>>) => {
  const traverseF = traverse(F)
  return (wa, f) => F.map(traverseF(wa, f), compact)
}
