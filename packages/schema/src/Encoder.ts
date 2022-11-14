/**
 * @since 1.0.0
 */

import type { Schema } from "@fp-ts/codec/Schema"
import * as S from "@fp-ts/codec/Schema"

/**
 * @since 1.0.0
 */
export interface Encoder<out O, in out A> extends Schema<A> {
  readonly encode: (value: A) => O
}

/**
 * @since 1.0.0
 */
export const make = <O, A>(schema: Schema<A>, encode: Encoder<O, A>["encode"]): Encoder<O, A> =>
  ({ meta: schema.meta, encode }) as any

/**
 * @since 1.0.0
 */
export const lazy = <O, A>(
  symbol: symbol,
  f: () => Encoder<O, A>
): Encoder<O, A> => {
  const get = S.memoize<void, Encoder<O, A>>(f)
  const schema = S.lazy(symbol, f)
  return make(
    schema,
    (a) => get().encode(a)
  )
}
