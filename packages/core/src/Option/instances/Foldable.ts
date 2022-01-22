// ets_tracing: off

import * as O from "@effect-ts/system/Option"

import * as P from "../../PreludeV2/index.js"
import type { OptionF } from "../definitions.js"

export const Foldable = P.instance<P.Foldable<OptionF>>({
  reduce: (b, f) => (fa) => O.isNone(fa) ? b : f(b, fa.value),
  reduceRight: (b, f) => (fa) => O.isNone(fa) ? b : f(fa.value, b),
  foldMap: (M) => (f) => (fa) => O.isNone(fa) ? M.identity : f(fa.value)
})
