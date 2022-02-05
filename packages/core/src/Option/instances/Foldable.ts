// ets_tracing: off

import * as O from "@effect-ts/system/Option"

import type { OptionURI } from "../../Modules/index.js"
import * as P from "../../Prelude/index.js"

export const Foldable = P.instance<P.Foldable<[P.URI<OptionURI>]>>({
  reduce: (b, f) => (fa) => O.isNone(fa) ? b : f(b, fa.value),
  reduceRight: (b, f) => (fa) => O.isNone(fa) ? b : f(fa.value, b),
  foldMap: (M) => (f) => (fa) => O.isNone(fa) ? M.identity : f(fa.value)
})
