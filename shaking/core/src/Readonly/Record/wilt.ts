import type { Applicative } from "fp-ts/lib/Applicative"
import type { Separated } from "fp-ts/lib/Compactable"
import type { HKT } from "fp-ts/lib/HKT"
import type { Wilt1 } from "fp-ts/lib/Witherable"

import type { Either } from "../../Either"

import type { ReadonlyRecord } from "./ReadonlyRecord"
import { URI } from "./URI"
import { separate } from "./separate"
import { traverse_ } from "./traverse_"

export const wilt: Wilt1<URI> = <F>(
  F: Applicative<F>
): (<A, B, C>(
  wa: ReadonlyRecord<string, A>,
  f: (a: A) => HKT<F, Either<B, C>>
) => HKT<F, Separated<ReadonlyRecord<string, B>, ReadonlyRecord<string, C>>>) => {
  const traverseF = traverse_(F)
  return (wa, f) => F.map(traverseF(wa, f), separate)
}
