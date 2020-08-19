import * as P from "../../Prelude"
import { succeedF } from "../../Prelude/DSL"

import { IterableURI } from "./definitions"

import { pipe } from "@effect-ts/system/Function"
import { reduce, of, never, concat } from "@effect-ts/system/Iterable"

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
  reduce(succeedF(G)(never as Iterable<typeof _.B>), (b, a) =>
    pipe(
      b,
      G.both(f(a)),
      G.map(([x, y]) => concat(x, of(y)))
    )
  )
)
