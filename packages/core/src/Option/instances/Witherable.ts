// ets_tracing: off

import type { OptionURI } from "../../Modules/index.js"
import * as P from "../../Prelude/index.js"
import { compactF } from "../operations/compactF.js"

export const Witherable = P.instance<P.Witherable<[P.URI<OptionURI>]>>({
  compactF
})
