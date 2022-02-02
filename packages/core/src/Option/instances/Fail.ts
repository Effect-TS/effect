// ets_tracing: off

import * as O from "@effect-ts/system/Option"

import type { OptionURI } from "../../Modules/index.js"
import * as P from "../../Prelude/index.js"

export const Fail = P.instance<P.FX.Fail<[P.URI<OptionURI>]>>({
  fail: () => O.none
})
