// ets_tracing: off

import type { IterableF } from "@effect-ts/core/Iterable/instances"
import { pipe } from "@effect-ts/system/Function"
import * as I from "@effect-ts/system/Iterable"

import { succeedF } from "../PreludeV2/DSL/index.js"
import * as P from "../PreludeV2/index.js"

export * from "@effect-ts/system/Iterable"

/**
 * `ForEach`'s `forEachF` function
 */
export const forEachF = P.implementForEachF<IterableF>()(
  (_) => (G) => (f) =>
    I.reduce(succeedF(G)(I.never as Iterable<typeof _.B>), (b, a) =>
      pipe(
        b,
        G.both(f(a)),
        G.map(({ tuple: [x, y] }) => I.concat(x, I.of(y)))
      )
    )
)
