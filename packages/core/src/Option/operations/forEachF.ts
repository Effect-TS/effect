// ets_tracing: off

import * as O from "@effect-ts/system/Option"

import { pipe } from "../../Function/index.js"
import type { OptionURI } from "../../Modules/index.js"
import type { URI } from "../../Prelude/index.js"
import * as P from "../../Prelude/index.js"

export const forEachF = P.implementForEachF<[URI<OptionURI>]>()(
  () => (G) => (f) => (fa) =>
    O.isNone(fa) ? P.succeedF(G)(O.none) : pipe(f(fa.value), G.map(O.some))
)
