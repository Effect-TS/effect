// ets_tracing: off

import * as O from "@effect-ts/system/Option"

import * as P from "../../Prelude/index.js"
import type { OptionF } from "../definitions.js"

export const Covariant = P.instance<P.Covariant<OptionF>>({
  map: O.map
})
