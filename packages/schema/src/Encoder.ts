/**
 * @since 1.0.0
 */

import * as boolean_ from "@fp-ts/codec/data/boolean"
import * as number_ from "@fp-ts/codec/data/number"
import * as I from "@fp-ts/codec/internal/common"
import type { Schema } from "@fp-ts/codec/Schema"
import * as S from "@fp-ts/codec/Schema"
import { identity } from "@fp-ts/data/Function"

/**
 * @since 1.0.0
 */
export interface Encoder<out O, in out A> extends Schema<A> {
  readonly encode: (value: A) => O
}

/**
 * @since 1.0.0
 */
export const make: <O, A>(schema: Schema<A>, encode: Encoder<O, A>["encode"]) => Encoder<O, A> =
  I.makeEncoder

/**
 * @since 1.0.0
 */
export const string: Encoder<string, string> = make(S.string, identity)

/**
 * @since 1.0.0
 */
export const number: Encoder<number, number> = number_.Encoder

/**
 * @since 1.0.0
 */
export const boolean: Encoder<boolean, boolean> = boolean_.Encoder

/**
 * @since 1.0.0
 */
export const of = <A>(
  value: A
): Encoder<A, A> => make(S.of(value), identity)

/**
 * @since 1.0.0
 */
export const toIndexSignature = <O, A>(
  value: Encoder<O, A>
): Encoder<{ readonly [_: string]: O }, { readonly [_: string]: A }> =>
  make(S.indexSignature(value), (a) => {
    const out = {}
    for (const key in a) {
      out[key] = value.encode(a[key])
    }
    return out
  })

/**
 * @since 1.0.0
 */
export const lazy = <O, A>(
  f: () => Encoder<O, A>
): Encoder<O, A> => {
  const get = S.memoize<void, Encoder<O, A>>(f)
  const schema = S.lazy(f)
  return make(
    schema,
    (a) => get().encode(a)
  )
}
