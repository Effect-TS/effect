// ets_tracing: off

import type { OptionURI } from "../../Modules/index.js"
import * as P from "../../Prelude/index.js"
import { separateF } from "../operations/separateF.js"

export const Wiltable = P.instance<P.Wiltable<[P.URI<OptionURI>]>>({
  separateF
})
