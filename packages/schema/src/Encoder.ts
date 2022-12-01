/**
 * @since 1.0.0
 */

import * as I from "@fp-ts/schema/internal/common"
import type { Schema } from "@fp-ts/schema/Schema"
import * as S from "@fp-ts/schema/Schema"

/**
 * @since 1.0.0
 */
export const EncoderId = I.EncoderId

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
export const fromTuple = <S, Components extends ReadonlyArray<Encoder<S, unknown>>>(
  ...components: Components
): Encoder<
  ReadonlyArray<S>,
  { readonly [K in keyof Components]: S.Infer<Components[K]> }
> =>
  make(
    S.tuple<Components>(...components),
    (a) => a.map((ai, i) => components[i].encode(ai))
  )

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
