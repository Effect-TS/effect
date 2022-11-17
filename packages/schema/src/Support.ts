/**
 * @since 1.0.0
 */
import { pipe } from "@fp-ts/data/Function"
import type { Option } from "@fp-ts/data/Option"
import * as O from "@fp-ts/data/Option"

/**
 * @since 1.0.0
 */
export interface Support {
  _id: symbol
}

/**
 * @since 1.0.0
 */
export interface TypeSupports extends Map<symbol, Support> {}

/**
 * @since 1.0.0
 */
export interface Supports extends Map<symbol, TypeSupports> {}

/**
 * @since 1.0.0
 */
export const findSupport = <A extends Support>(
  supports: Supports,
  interpreterId: symbol,
  typeId: symbol,
  is: (service: Support) => service is A
): Option<A> =>
  pipe(
    O.fromNullable(supports.get(interpreterId)),
    O.flatMapNullable((supports) => supports.get(typeId)),
    O.flatMap((support) => is(support) ? O.some(support) : O.none)
  )
