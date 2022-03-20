// ets_tracing: off

import type { EitherFixedLeftF } from "@effect-ts/core/Either"

import type { Identity } from "../../Identity/index.js"
import * as P from "../../PreludeV2/index.js"
import { getSeparateF } from "./separate.js"

/**
 * Get `Wiltable` instance given `Identity<E>`
 */
export function getWiltable<E>(M: Identity<E>) {
  const separateF = getSeparateF(M)
  return P.instance<P.Wiltable<EitherFixedLeftF<E>>>({
    separateF
  })
}
