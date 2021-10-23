// ets_tracing: off

import type { OptionURI } from "../../Modules"
import * as P from "../../Prelude"
import { forEachF } from "../operations/forEachF"
import { Covariant } from "./Covariant"

export const ForEach = P.instance<P.ForEach<[P.URI<OptionURI>]>>({
  ...Covariant,
  forEachF
})
