// ets_tracing: off

import type { Identity } from "../../Identity/index.js"
import * as P from "../../Prelude/index.js"
import type { EitherFixedLeftF } from "../instances.js"
import { getCompactF } from "./compactOption.js"

/**
 * Get `Witherable` instance given `Identity<E>`
 */
export function getWitherable<E>(M: Identity<E>) {
  const compactF = getCompactF(M)
  return P.instance<P.Witherable<EitherFixedLeftF<E>>>({
    compactF
  })
}
