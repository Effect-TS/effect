// ets_tracing: off

import type { OptionURI } from "../../Modules"
import * as P from "../../Prelude"
import { Any } from "./Any"
import { AssociativeBoth } from "./AssociativeBoth"

export const IdentityBoth = P.instance<P.IdentityBoth<[P.URI<OptionURI>]>>({
  ...Any,
  ...AssociativeBoth
})
