/**
 * @since 1.0.0
 */
import * as P from "../../Prelude"

import { IterableURI } from "./definitions"

import { pipe } from "@effect-ts/system/Function"
import { reduce, of, never, concat } from "@effect-ts/system/Iterable"

export {
  /**
   * @since 1.0.0
   */
  ap,
  /**
   * @since 1.0.0
   */
  chain,
  /**
   * @since 1.0.0
   */
  chain_,
  /**
   * @since 1.0.0
   */
  concat,
  /**
   * @since 1.0.0
   */
  flatten,
  /**
   * @since 1.0.0
   */
  foldMap,
  /**
   * @since 1.0.0
   */
  map,
  /**
   * @since 1.0.0
   */
  map_,
  /**
   * @since 1.0.0
   */
  never,
  /**
   * @since 1.0.0
   */
  of,
  /**
   * @since 1.0.0
   */
  reduce,
  /**
   * @since 1.0.0
   */
  reduce_,
  /**
   * @since 1.0.0
   */
  reduceRight,
  /**
   * @since 1.0.0
   */
  reduceRight_,
  /**
   * @since 1.0.0
   */
  zip,
  /**
   * @since 1.0.0
   */
  zip_
} from "@effect-ts/system/Iterable"

/**
 * @since 1.0.0
 */
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
