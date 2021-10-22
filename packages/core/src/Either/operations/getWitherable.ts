// ets_tracing: off

import type { Identity } from "../../Identity"
import type { EitherURI } from "../../Modules"
import * as P from "../../Prelude"
import { getCompactF } from "./compactOption"

/**
 * Get `Witherable` instance given `Identity<E>`
 */
export function getWitherable<E>(M: Identity<E>) {
  const compactF = getCompactF(M)
  return P.instance<P.Witherable<[P.URI<EitherURI>], P.Fix<"E", E>>>({
    compactF
  })
}
