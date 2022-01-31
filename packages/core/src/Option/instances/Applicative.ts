// ets_tracing: off

import type { OptionURI } from "../../Modules/index.js"
import * as P from "../../Prelude/index.js"
import { Covariant } from "./Covariant.js"
import { IdentityBoth } from "./IdentityBoth.js"

export const Applicative = P.instance<P.Applicative<[P.URI<OptionURI>]>>({
  ...Covariant,
  ...IdentityBoth
})
