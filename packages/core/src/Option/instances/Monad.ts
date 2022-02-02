// ets_tracing: off

import type { OptionURI } from "../../Modules"
import * as P from "../../Prelude"
import { Covariant } from "./Covariant"
import { IdentityFlatten } from "./IdentityFlatten"

export const Monad = P.instance<P.Monad<[P.URI<OptionURI>]>>({
  ...Covariant,
  ...IdentityFlatten
})
