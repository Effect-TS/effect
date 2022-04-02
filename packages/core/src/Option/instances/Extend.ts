// ets_tracing: off

import * as O from "@effect-ts/system/Option"

import * as P from "../../Prelude/index.js"
import type { OptionF } from "../definitions.js"

export const Extend = P.instance<P.Extend<OptionF>>({
  extend: O.extend
})
