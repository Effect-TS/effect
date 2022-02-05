// ets_tracing: off

import * as O from "@effect-ts/system/Option"

import type { OptionURI } from "../../Modules/index.js"
import * as P from "../../Prelude/index.js"

export const Any = P.instance<P.Any<[P.URI<OptionURI>]>>({
  any: () => O.some({})
})
