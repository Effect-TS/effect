// ets_tracing: off

import type { Identity } from "../../Identity/index.js"
import type { EitherURI } from "../../Modules/index.js"
import * as P from "../../Prelude/index.js"
import { getCompact } from "./compactOption.js"
import { getSeparate } from "./separate.js"

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
