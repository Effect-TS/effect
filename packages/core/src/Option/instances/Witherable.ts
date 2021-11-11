// ets_tracing: off

import type { OptionURI } from "../../Modules"
import * as P from "../../Prelude"
import { compactF } from "../operations/compactF"

export const Witherable = P.instance<P.Witherable<[P.URI<OptionURI>]>>({
  compactF
})
