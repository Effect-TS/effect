// ets_tracing: off

import * as P from "../../PreludeV2/index.js"
import type { OptionF } from "../definitions.js"
import { Covariant } from "./Covariant.js"
import { IdentityBoth } from "./IdentityBoth.js"

export const Applicative = P.instance<P.Applicative<OptionF>>({
  ...Covariant,
  ...IdentityBoth
})
