/**
 * @since 1.0.0
 */

import * as boolean_ from "@fp-ts/codec/data/boolean"
import * as number_ from "@fp-ts/codec/data/number"
import * as string_ from "@fp-ts/codec/data/string"
import * as I from "@fp-ts/codec/internal/common"
import type { Schema } from "@fp-ts/codec/Schema"
import * as S from "@fp-ts/codec/Schema"
import { identity } from "@fp-ts/data/Function"

/**
 * @since 1.0.0
 */
export interface Encoder<out S, in out A> extends Schema<A> {
  readonly encode: (value: A) => S
}

/**
 * @since 1.0.0
 */
export const make: <S, A>(schema: Schema<A>, encode: Encoder<S, A>["encode"]) => Encoder<S, A> =
  I.makeEncoder

/**
 * @since 1.0.0
 */
export const string: Encoder<string, string> = string_.Encoder

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
export const toIndexSignature = <S, A>(
  value: Encoder<S, A>
): Encoder<{ readonly [_: string]: S }, { readonly [_: string]: A }> =>
  make(S.indexSignature(value), (a) => {
    const out: any = {}
    for (const key in a) {
      out[key] = value.encode(a[key])
    }
    return out
  })

/**
 * @since 1.0.0
 */
export const lazy = <S, A>(
  f: () => Encoder<S, A>
): Encoder<S, A> => {
  const get = S.memoize<void, Encoder<S, A>>(f)
  const schema = S.lazy(f)
  return make(
    schema,
    (a) => get().encode(a)
  )
}
