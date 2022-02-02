// ets_tracing: off

import * as O from "@effect-ts/system/Option"

import type { OptionURI } from "../../Modules"
import * as P from "../../Prelude"

export const Fail = P.instance<P.FX.Fail<[P.URI<OptionURI>]>>({
  fail: () => O.none
})
