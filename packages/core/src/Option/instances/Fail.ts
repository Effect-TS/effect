// ets_tracing: off

import * as O from "@effect-ts/system/Option"

import * as P from "../../Prelude/index.js"
import type { OptionF } from "../definitions.js"

export const Fail = P.instance<P.FX.Fail<OptionF>>({
  fail: () => O.none
})
