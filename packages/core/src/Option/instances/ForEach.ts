// ets_tracing: off

import type { OptionURI } from "../../Modules/index.js"
import * as P from "../../Prelude/index.js"
import { forEachF } from "../operations/forEachF.js"
import { Covariant } from "./Covariant.js"

export const ForEach = P.instance<P.ForEach<[P.URI<OptionURI>]>>({
  ...Covariant,
  forEachF
})
