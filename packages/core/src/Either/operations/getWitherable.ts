// ets_tracing: off

import type { Identity } from "../../Identity/index.js"
import type { EitherURI } from "../../Modules/index.js"
import * as P from "../../Prelude/index.js"
import { getCompactF } from "./compactOption.js"

/**
 * Get `Witherable` instance given `Identity<E>`
 */
export function getWitherable<E>(M: Identity<E>) {
  const compactF = getCompactF(M)
  return P.instance<P.Witherable<[P.URI<EitherURI>], P.Fix<"E", E>>>({
    compactF
  })
}
