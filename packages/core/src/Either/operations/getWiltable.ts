// ets_tracing: off

import type { Identity } from "../../Identity"
import type { EitherURI } from "../../Modules"
import * as P from "../../Prelude"
import { getSeparateF } from "./separate"

/**
 * Get `Wiltable` instance given `Identity<E>`
 */
export function getWiltable<E>(M: Identity<E>) {
  const separateF = getSeparateF(M)
  return P.instance<P.Wiltable<[P.URI<EitherURI>], P.Fix<"E", E>>>({
    separateF
  })
}
