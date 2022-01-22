// ets_tracing: off

import * as O from "@effect-ts/system/Option"

import * as P from "../../PreludeV2/index.js"
import type { OptionF } from "../definitions.js"

export const AssociativeBoth = P.instance<P.AssociativeBoth<OptionF>>({
  both: O.zip
})
