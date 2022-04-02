// ets_tracing: off

import * as P from "../../Prelude/index.js"
import type { OptionF } from "../definitions.js"
import { forEachF } from "../operations/forEachF.js"
import { Covariant } from "./Covariant.js"

export const ForEach = P.instance<P.ForEach<OptionF>>({
  ...Covariant,
  forEachF
})
