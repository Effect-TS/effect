// ets_tracing: off

import { pipe } from "@effect-ts/system/Function"
import * as I from "@effect-ts/system/Iterable"

import type { IterableURI } from "../Modules/index.js"
import { succeedF } from "../Prelude/DSL/index.js"
import type { URI } from "../Prelude/index.js"
import * as P from "../Prelude/index.js"

export * from "@effect-ts/system/Iterable"

/**
 * `ForEach`'s `forEachF` function
 */
export const forEachF = P.implementForEachF<[URI<IterableURI>]>()(
  (_) => (G) => (f) =>
    I.reduce(succeedF(G)(I.never as Iterable<typeof _.B>), (b, a) =>
      pipe(
        b,
        G.both(f(a)),
        G.map(({ tuple: [x, y] }) => I.concat(x, I.of(y)))
      )
    )
)
