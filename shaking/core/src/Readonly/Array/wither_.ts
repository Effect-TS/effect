import type { Applicative } from "fp-ts/lib/Applicative"
import type { HKT } from "fp-ts/lib/HKT"
import type { Wither1 } from "fp-ts/lib/Witherable"

import type { Option } from "../../Option/Option"

import { URI } from "./URI"
import { compact_ } from "./compact_"
import { traverse_ } from "./traverse_"

export const wither_: Wither1<URI> = <F>(
  F: Applicative<F>
): (<A, B>(
  ta: ReadonlyArray<A>,
  f: (a: A) => HKT<F, Option<B>>
) => HKT<F, ReadonlyArray<B>>) => {
  const traverseF = traverse_(F)
  return (wa, f) => F.map(traverseF(wa, f), compact_)
}
