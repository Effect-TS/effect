// ets_tracing: off

import * as O from "@effect-ts/system/Option"

import type { OptionURI } from "../../Modules"
import * as P from "../../Prelude"
import { separate } from "../operations/separate"

export const Compactable = P.instance<P.Compactable<[P.URI<OptionURI>]>>({
  compact: O.flatten,
  separate
})
