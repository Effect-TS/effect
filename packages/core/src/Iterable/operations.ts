import { pipe } from "@effect-ts/system/Function"
import * as I from "@effect-ts/system/Iterable"

import * as P from "../Prelude"
import type { IterableURI } from "./instances"

export * from "@effect-ts/system/Iterable"

export const forEachF = P.implementForEachF<[IterableURI]>()((_) => (G) => (f) =>
  I.reduce(P.succeedF(G)(I.never as Iterable<typeof _.B>), (b, a) =>
    pipe(
      b,
      G.both(f(a)),
      G.map(([x, y]) => I.concat(x, I.of(y)))
    )
  )
)
