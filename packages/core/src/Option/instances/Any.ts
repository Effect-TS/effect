// ets_tracing: off

import * as O from "@effect-ts/system/Option"

import type { OptionURI } from "../../Modules"
import * as P from "../../Prelude"

export const Any = P.instance<P.Any<[P.URI<OptionURI>]>>({
  any: () => O.some({})
})
