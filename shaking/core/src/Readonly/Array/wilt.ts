import type { Applicative } from "fp-ts/lib/Applicative"
import type { Separated } from "fp-ts/lib/Compactable"
import type { HKT } from "fp-ts/lib/HKT"
import type { Wilt1 } from "fp-ts/lib/Witherable"

import type { Either } from "../../Either/Either"

import { URI } from "./URI"
import { separate } from "./separate"
import { traverse } from "./traverse"

export const wilt: Wilt1<URI> = <F>(
  F: Applicative<F>
): (<A, B, C>(
  wa: ReadonlyArray<A>,
  f: (a: A) => HKT<F, Either<B, C>>
) => HKT<F, Separated<ReadonlyArray<B>, ReadonlyArray<C>>>) => {
  const traverseF = traverse(F)
  return (wa, f) => F.map(traverseF(wa, f), separate)
}
