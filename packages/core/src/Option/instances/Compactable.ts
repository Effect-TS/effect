// ets_tracing: off

import * as O from "@effect-ts/system/Option"

import type { OptionURI } from "../../Modules/index.js"
import * as P from "../../Prelude/index.js"
import { separate } from "../operations/separate.js"

export const Compactable = P.instance<P.Compactable<[P.URI<OptionURI>]>>({
  compact: O.flatten,
  separate
})
