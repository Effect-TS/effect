// ets_tracing: off

import type { Identity } from "../../Identity/index.js"
import type { EitherURI } from "../../Modules/index.js"
import * as P from "../../Prelude/index.js"
import { getSeparateF } from "./separate.js"

/**
 * Get `Wiltable` instance given `Identity<E>`
 */
export function getWiltable<E>(M: Identity<E>) {
  const separateF = getSeparateF(M)
  return P.instance<P.Wiltable<[P.URI<EitherURI>], P.Fix<"E", E>>>({
    separateF
  })
}
