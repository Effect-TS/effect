// ets_tracing: off

import * as O from "@effect-ts/system/Option"

import { pipe } from "../../Function"
import type { OptionURI } from "../../Modules"
import type { URI } from "../../Prelude"
import * as P from "../../Prelude"

export const forEachF = P.implementForEachF<[URI<OptionURI>]>()(
  () => (G) => (f) => (fa) =>
    O.isNone(fa) ? P.succeedF(G)(O.none) : pipe(f(fa.value), G.map(O.some))
)
