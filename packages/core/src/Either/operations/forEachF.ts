// ets_tracing: off

import * as E from "@effect-ts/system/Either"

import { pipe } from "../../Function/index.js"
import * as PV2DSL from "../../PreludeV2/DSL/index.js"
import type * as PV2 from "../../PreludeV2/index.js"
import type { EitherF } from "../instances.js"

/**
 * `ForEach`'s `forEachF` function
 */
export const forEachF: PV2.ForeachFn<EitherF> = (G) => (f) => (fa) =>
  E.isLeft(fa) ? PV2DSL.succeedF(G, G)(fa) : pipe(f(fa.right), G.map(E.right))
