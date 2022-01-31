// ets_tracing: off

import * as E from "@effect-ts/system/Either"

import { pipe } from "../../Function/index.js"
import type { EitherURI } from "../../Modules/index.js"
import * as DSL from "../../Prelude/DSL/index.js"
import * as P from "../../Prelude/index.js"
import type { V } from "../definition.js"

/**
 * `ForEach`'s `forEachF` function
 */
export const forEachF = P.implementForEachF<[P.URI<EitherURI>], V>()(
  (_) => (G) => (f) => (fa) =>
    E.isLeft(fa) ? DSL.succeedF(G)(fa) : pipe(f(fa.right), G.map(E.right))
)
