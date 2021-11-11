// ets_tracing: off

import type { OptionURI } from "../../Modules"
import * as P from "../../Prelude"
import { Any } from "./Any"
import { AssociativeFlatten } from "./AssociativeFlatten"

export const IdentityFlatten = P.instance<P.IdentityFlatten<[P.URI<OptionURI>]>>({
  ...Any,
  ...AssociativeFlatten
})
