// ets_tracing: off

import * as O from "@effect-ts/system/Option"

import type { OptionURI } from "../../Modules/index.js"
import * as P from "../../Prelude/index.js"

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<[P.URI<OptionURI>]>>({
  flatten: O.flatten
})
