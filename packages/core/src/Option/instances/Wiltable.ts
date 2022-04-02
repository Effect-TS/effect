// ets_tracing: off

import * as P from "../../Prelude/index.js"
import type { OptionF } from "../definitions.js"
import { separateF } from "../operations/separateF.js"

export const Wiltable = P.instance<P.Wiltable<OptionF>>({
  separateF
})
