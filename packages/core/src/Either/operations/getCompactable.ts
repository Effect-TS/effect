// ets_tracing: off

import type { Identity } from "../../Identity"
import type { EitherURI } from "../../Modules"
import * as P from "../../Prelude"
import { getCompact } from "./compactOption"
import { getSeparate } from "./separate"

/**
 * Get `Compactable` instance given `Identity<E>`
 */
export function getCompactable<E>(M: Identity<E>) {
  const C = getCompact(M)
  const S = getSeparate(M)
  return P.instance<P.Compactable<[P.URI<EitherURI>], P.Fix<"E", E>>>({
    ...C,
    ...S
  })
}
