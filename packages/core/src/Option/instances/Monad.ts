// ets_tracing: off

import * as P from "../../Prelude/index.js"
import type { OptionF } from "../definitions.js"
import { Covariant } from "./Covariant.js"
import { IdentityFlatten } from "./IdentityFlatten.js"

export const Monad = P.instance<P.Monad<OptionF>>({
  ...Covariant,
  ...IdentityFlatten
})
