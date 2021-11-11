// ets_tracing: off

import type { OptionURI } from "../../Modules"
import * as P from "../../Prelude"
import { separateF } from "../operations/separateF"

export const Wiltable = P.instance<P.Wiltable<[P.URI<OptionURI>]>>({
  separateF
})
