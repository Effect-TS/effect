// ets_tracing: off

import type { OptionURI } from "../../Modules/index.js"
import * as P from "../../Prelude/index.js"
import { Any } from "./Any.js"
import { AssociativeFlatten } from "./AssociativeFlatten.js"

export const IdentityFlatten = P.instance<P.IdentityFlatten<[P.URI<OptionURI>]>>({
  ...Any,
  ...AssociativeFlatten
})
