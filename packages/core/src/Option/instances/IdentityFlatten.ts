// ets_tracing: off

import * as P from "../../Prelude/index.js"
import type { OptionF } from "../definitions.js"
import { Any } from "./Any.js"
import { AssociativeFlatten } from "./AssociativeFlatten.js"

export const IdentityFlatten = P.instance<P.IdentityFlatten<OptionF>>({
  ...Any,
  ...AssociativeFlatten
})
