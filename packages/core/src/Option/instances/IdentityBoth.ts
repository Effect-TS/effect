// ets_tracing: off

import type { OptionURI } from "../../Modules/index.js"
import * as P from "../../Prelude/index.js"
import { Any } from "./Any.js"
import { AssociativeBoth } from "./AssociativeBoth.js"

export const IdentityBoth = P.instance<P.IdentityBoth<[P.URI<OptionURI>]>>({
  ...Any,
  ...AssociativeBoth
})
