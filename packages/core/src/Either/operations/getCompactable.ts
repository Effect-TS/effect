// ets_tracing: off

import type { Identity } from "../../Identity/index.js"
import * as P from "../../Prelude/index.js"
import type { EitherFixedLeftF } from "../instances.js"
import { getCompact } from "./compactOption.js"
import { getSeparate } from "./separate.js"

/**
 * Get `Compactable` instance given `Identity<E>`
 */
export function getCompactable<E>(M: Identity<E>) {
  const C = getCompact(M)
  const S = getSeparate(M)
  return P.instance<P.Compactable<EitherFixedLeftF<E>>>({
    ...C,
    ...S
  })
}
