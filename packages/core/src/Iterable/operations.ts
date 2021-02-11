import { pipe } from "@effect-ts/system/Function"
import * as I from "@effect-ts/system/Iterable"

import type { IterableURI } from "../Modules"
import type { URI } from "../Prelude"
import * as P from "../Prelude"
import { succeedF } from "../Prelude/DSL"

export * from "@effect-ts/system/Iterable"

export const forEachF = P.implementForEachF<URI<IterableURI>>()((_) => (G) => (f) =>
  I.reduce(succeedF(G)(I.never as Iterable<typeof _.B>), (b, a) =>
    pipe(
      b,
      G.both(f(a)),
      G.map(([x, y]) => I.concat(x, I.of(y)))
    )
  )
)
