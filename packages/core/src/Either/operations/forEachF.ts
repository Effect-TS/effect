// ets_tracing: off

import * as E from "@effect-ts/system/Either"

import { pipe } from "../../Function"
import type { EitherURI } from "../../Modules"
import * as P from "../../Prelude"
import * as DSL from "../../Prelude/DSL"
import type { V } from "../definition"

/**
 * `ForEach`'s `forEachF` function
 */
export const forEachF = P.implementForEachF<[P.URI<EitherURI>], V>()(
  (_) => (G) => (f) => (fa) =>
    E.isLeft(fa) ? DSL.succeedF(G)(fa) : pipe(f(fa.right), G.map(E.right))
)
