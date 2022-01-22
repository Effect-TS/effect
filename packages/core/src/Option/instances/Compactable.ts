// ets_tracing: off

import * as O from "@effect-ts/system/Option"

import * as P from "../../PreludeV2/index.js"
import type { OptionF } from "../definitions.js"
import { separate } from "../operations/separate.js"

export const Compactable = P.instance<P.Compactable<OptionF>>({
  compact: O.flatten,
  separate
})
