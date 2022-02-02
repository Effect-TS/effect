// ets_tracing: off

import * as O from "@effect-ts/system/Option"

import type { OptionURI } from "../../Modules"
import * as P from "../../Prelude"

export const Extend = P.instance<P.Extend<[P.URI<OptionURI>]>>({
  extend: O.extend
})
