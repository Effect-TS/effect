// ets_tracing: off

import * as O from "@effect-ts/system/Option"

import type { OptionURI } from "../../Modules"
import * as P from "../../Prelude"

export const AssociativeBoth = P.instance<P.AssociativeBoth<[P.URI<OptionURI>]>>({
  both: O.zip
})
