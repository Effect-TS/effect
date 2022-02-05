// ets_tracing: off

import type { OptionURI } from "../../Modules/index.js"
import * as P from "../../Prelude/index.js"
import { Covariant } from "./Covariant.js"
import { IdentityFlatten } from "./IdentityFlatten.js"

export const Monad = P.instance<P.Monad<[P.URI<OptionURI>]>>({
  ...Covariant,
  ...IdentityFlatten
})
