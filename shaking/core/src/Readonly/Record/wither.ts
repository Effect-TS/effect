import type { Applicative } from "fp-ts/lib/Applicative"
import type { HKT } from "fp-ts/lib/HKT"
import type { Wither1 } from "fp-ts/lib/Witherable"

import type { Option } from "../../Option"

import type { ReadonlyRecord } from "./ReadonlyRecord"
import { URI } from "./URI"
import { compact } from "./compact"
import { traverse_ } from "./traverse_"

export const wither: Wither1<URI> = <F>(
  F: Applicative<F>
): (<A, B>(
  wa: ReadonlyRecord<string, A>,
  f: (a: A) => HKT<F, Option<B>>
) => HKT<F, ReadonlyRecord<string, B>>) => {
  const traverseF = traverse_(F)
  return (wa, f) => F.map(traverseF(wa, f), compact)
}
