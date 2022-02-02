// ets_tracing: off

import type { OptionURI } from "../../Modules"
import * as P from "../../Prelude"
import { Covariant } from "./Covariant"
import { IdentityBoth } from "./IdentityBoth"

export const Applicative = P.instance<P.Applicative<[P.URI<OptionURI>]>>({
  ...Covariant,
  ...IdentityBoth
})
