import { pipe } from "@effect-ts/system/Function"
import { concat, never, of, reduce } from "@effect-ts/system/Iterable"

import type { IterableURI } from "../../Modules"
import * as P from "../../Prelude"
import { succeedF } from "../../Prelude/DSL"

export * from "@effect-ts/system/Iterable"

export const foreachF = P.implementForeachF<[IterableURI]>()((_) => (G) => (f) =>
  reduce(succeedF(G)(never as Iterable<typeof _.B>), (b, a) =>
    pipe(
      b,
      G.both(f(a)),
      G.map(([x, y]) => concat(x, of(y)))
    )
  )
)
