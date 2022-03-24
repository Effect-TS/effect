// ets_tracing: off

import { getApplyF } from "@effect-ts/core/PreludeV2"

import type { Applicative } from "../Applicative/index.js"
import * as HKT from "../HKT/index.js"
import type { Monad } from "../Monad/index.js"

export function getApplicativeF<F extends HKT.HKT>(F_: Monad<F>): Applicative<F> {
  const Apply = getApplyF(F_)
  return HKT.instance<Applicative<F>>({
    ...Apply,
    any: F_.any
  })
}
