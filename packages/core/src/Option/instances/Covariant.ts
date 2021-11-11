// ets_tracing: off

import * as O from "@effect-ts/system/Option"

import type { OptionURI } from "../../Modules"
import * as P from "../../Prelude"

export const Covariant = P.instance<P.Covariant<[P.URI<OptionURI>]>>({
  map: O.map
})
