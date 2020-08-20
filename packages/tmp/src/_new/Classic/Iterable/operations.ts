import { pipe } from "@effect-ts/system/Function"
import { concat, never, of, reduce } from "@effect-ts/system/Iterable"

import * as P from "../../Prelude"
import type { IterableURI } from "./definitions"

export {
  ap,
  chain,
  chain_,
  concat,
  flatten,
  foldMap,
  map,
  map_,
  never,
  of,
  reduce,
  reduce_,
  reduceRight,
  reduceRight_,
  zip,
  zip_
} from "@effect-ts/system/Iterable"

export const foreachF = P.implementForeachF<IterableURI>()((_) => (G) => (f) =>
  reduce(
    pipe(
      G.any(),
      G.map(() => never as Iterable<typeof _.B>)
    ),
    (b, a) =>
      pipe(
        b,
        G.both(f(a)),
        G.map(([x, y]) => concat(x, of(y)))
      )
  )
)
